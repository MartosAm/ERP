/**
 * src/modulos/auth/auth.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de autenticacion.
 *
 * Responsabilidades:
 * - Verificar credenciales (correo + contrasena con bcrypt)
 * - Aplicar reglas de seguridad (bloqueo por intentos, horario laboral)
 * - Crear y destruir sesiones en la tabla sesiones
 * - Generar tokens JWT con payload tipado
 * - Cambiar PIN de autorizacion para caja
 *
 * Reglas de negocio:
 * - Despues de 5 intentos fallidos: bloquear usuario 30 minutos
 * - CAJERO y REPARTIDOR: restringir login por horario laboral
 * - Mensajes de error genericos: nunca revelar si fallo correo o contrasena
 * - Sesiones stateful: validadas en BD en cada request
 * ------------------------------------------------------------------
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../compartido/logger';
import {
  ErrorNoAutorizado,
  ErrorAcceso,
  ErrorNoEncontrado,
  ErrorConflicto,
} from '../../compartido/errores';
import type { LoginDto, RegistroDto, CambiarPinDto } from './auth.schema';
import type { JwtPayload } from '../../tipos/express';

// Mensaje generico de error de login.
// Nunca indicar si fue el correo o la contrasena lo que fallo.
const MSG_CREDENCIALES_INVALIDAS = 'Credenciales invalidas';

// Maximo de intentos fallidos antes de bloquear la cuenta
const MAX_INTENTOS_FALLIDOS = 5;

// Duracion del bloqueo en minutos
const MINUTOS_BLOQUEO = 30;

export const AuthService = {

  // ================================================================
  // REGISTRO
  // Solo ADMIN puede registrar usuarios nuevos en su empresa
  // ================================================================

  /**
   * Registra un nuevo usuario en la empresa del admin que lo crea.
   *
   * Flujo:
   * 1. Verificar que no exista un usuario con ese correo
   * 2. Hashear la contrasena con bcrypt
   * 3. Crear el usuario asociado a la empresa del admin
   * 4. Retornar datos del usuario creado (sin datos sensibles)
   *
   * @param dto - Datos del nuevo usuario validados por Zod
   * @param empresaId - ID de la empresa del admin que registra
   * @returns Datos del usuario creado
   */
  async registrar(dto: RegistroDto, empresaId: string) {
    // 1. Verificar unicidad del correo
    const existente = await prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });

    if (existente) {
      throw new ErrorConflicto('Ya existe un usuario con ese correo');
    }

    // 2. Hashear la contrasena con bcrypt (salt rounds desde env)
    const hashContrasena = await bcrypt.hash(dto.contrasena, env.BCRYPT_SALT_ROUNDS);

    // 3. Crear usuario en BD
    const usuario = await prisma.usuario.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        correo: dto.correo,
        hashContrasena,
        rol: dto.rol as 'ADMIN' | 'CAJERO' | 'REPARTIDOR',
        telefono: dto.telefono ?? null,
        horarioInicio: dto.horarioInicio ?? null,
        horarioFin: dto.horarioFin ?? null,
        diasLaborales: dto.diasLaborales ?? [],
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        telefono: true,
        horarioInicio: true,
        horarioFin: true,
        diasLaborales: true,
        activo: true,
        creadoEn: true,
      },
    });

    logger.info({
      mensaje: 'Usuario registrado',
      usuarioId: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      empresaId,
    });

    return usuario;
  },

  // ================================================================
  // LOGIN
  // Verificar credenciales -> reglas de seguridad -> crear sesion -> JWT
  // ================================================================

  /**
   * Inicia sesion de un usuario.
   *
   * Flujo completo:
   * 1. Buscar usuario por correo (incluye empresa)
   * 2. Verificar que el usuario esta activo
   * 3. Verificar que no esta bloqueado por intentos fallidos
   * 4. Comparar contrasena con hash bcrypt
   * 5. Verificar horario laboral (CAJERO/REPARTIDOR)
   * 6. Resetear intentos fallidos
   * 7. Crear sesion en BD
   * 8. Generar y retornar JWT
   *
   * @param dto - Correo y contrasena validados por Zod
   * @param ip - Direccion IP del cliente (para auditoria)
   * @param agenteUsuario - User-Agent del navegador (para auditoria)
   * @returns Token JWT y datos basicos del usuario
   */
  async login(dto: LoginDto, ip?: string, agenteUsuario?: string) {
    // 1. Buscar usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { correo: dto.correo },
      include: {
        empresa: {
          select: { id: true, nombre: true, activo: true },
        },
      },
    });

    // Si no existe, lanzar error generico (no revelar que el correo no existe)
    if (!usuario) {
      throw new ErrorNoAutorizado(MSG_CREDENCIALES_INVALIDAS);
    }

    // 2. Verificar que el usuario esta activo
    if (!usuario.activo) {
      throw new ErrorNoAutorizado(MSG_CREDENCIALES_INVALIDAS);
    }

    // Verificar que la empresa esta activa
    if (!usuario.empresa.activo) {
      throw new ErrorNoAutorizado('La empresa esta desactivada');
    }

    // 3. Verificar bloqueo por intentos fallidos
    if (usuario.bloqueadoHasta && dayjs().isBefore(dayjs(usuario.bloqueadoHasta))) {
      const minutosRestantes = dayjs(usuario.bloqueadoHasta).diff(dayjs(), 'minute');
      throw new ErrorAcceso(
        `Cuenta bloqueada. Intente de nuevo en ${minutosRestantes + 1} minutos`,
      );
    }

    // 4. Comparar contrasena con hash bcrypt
    const contrasenaValida = await bcrypt.compare(dto.contrasena, usuario.hashContrasena);

    if (!contrasenaValida) {
      // Incrementar intentos fallidos
      const nuevosIntentos = usuario.intentosFallidos + 1;
      const datosActualizacion: Record<string, unknown> = {
        intentosFallidos: nuevosIntentos,
      };

      // Si alcanzo el maximo, bloquear la cuenta
      if (nuevosIntentos >= MAX_INTENTOS_FALLIDOS) {
        datosActualizacion.bloqueadoHasta = dayjs().add(MINUTOS_BLOQUEO, 'minute').toDate();
        logger.warn({
          mensaje: 'Cuenta bloqueada por intentos fallidos',
          correo: dto.correo,
          intentos: nuevosIntentos,
        });
      }

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: datosActualizacion,
      });

      throw new ErrorNoAutorizado(MSG_CREDENCIALES_INVALIDAS);
    }

    // 5. Verificar horario laboral (solo para CAJERO y REPARTIDOR)
    if (usuario.rol !== 'ADMIN') {
      this.verificarHorarioLaboral(usuario);
    }

    // 6. Resetear intentos fallidos y actualizar ultimo login
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoLoginEn: new Date(),
      },
    });

    // 7. Crear sesion en BD
    const expiracion = dayjs().add(
      parseInt(env.JWT_EXPIRES_IN) || 8,
      'hour',
    ).toDate();

    const sesion = await prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        token: '', // Se actualiza despues de generar el JWT
        direccionIp: ip ?? null,
        agenteUsuario: agenteUsuario ?? null,
        activo: true,
        expiraEn: expiracion,
      },
    });

    // 8. Generar JWT con el payload tipado
    const payload: JwtPayload = {
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      sesionId: sesion.id,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string & { __brand: 'StringValue' },
    } as jwt.SignOptions);

    // Actualizar la sesion con el hash del token
    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { token },
    });

    logger.info({
      mensaje: 'Login exitoso',
      usuarioId: usuario.id,
      rol: usuario.rol,
      empresa: usuario.empresa.nombre,
    });

    // Retornar datos para la respuesta (sin datos sensibles)
    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        avatarUrl: usuario.avatarUrl,
        empresa: {
          id: usuario.empresa.id,
          nombre: usuario.empresa.nombre,
        },
      },
    };
  },

  // ================================================================
  // LOGOUT
  // Desactivar la sesion en BD para invalidar el token
  // ================================================================

  /**
   * Cierra la sesion activa del usuario.
   * Marca la sesion como inactiva en BD. El token queda invalido
   * en el siguiente request porque autenticar.ts verifica sesion.activo.
   *
   * @param sesionId - ID de la sesion a cerrar (desde req.user.sesionId)
   */
  async logout(sesionId: string): Promise<void> {
    await prisma.sesion.update({
      where: { id: sesionId },
      data: { activo: false },
    });

    logger.info({ mensaje: 'Logout exitoso', sesionId });
  },

  // ================================================================
  // PERFIL
  // Obtener datos del usuario autenticado
  // ================================================================

  /**
   * Retorna los datos del usuario actual sin informacion sensible.
   * Excluye: hashContrasena, hashPin, intentosFallidos, bloqueadoHasta.
   *
   * @param usuarioId - ID del usuario (desde req.user.usuarioId)
   * @param empresaId - ID de la empresa (desde req.user.empresaId)
   */
  async obtenerPerfil(usuarioId: string, empresaId: string) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        telefono: true,
        avatarUrl: true,
        horarioInicio: true,
        horarioFin: true,
        diasLaborales: true,
        ultimoLoginEn: true,
        creadoEn: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            moneda: true,
            tasaImpuesto: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    return usuario;
  },

  // ================================================================
  // CAMBIAR PIN
  // Solo ADMIN puede cambiar el PIN de autorizacion de un usuario
  // ================================================================

  /**
   * Cambia el PIN de autorizacion en caja de un usuario.
   * El PIN se usa para aprobar descuentos y cancelaciones que
   * requieren autorizacion de supervisor.
   *
   * @param dto - ID del usuario y nuevo PIN (validados por Zod)
   * @param empresaId - ID de la empresa (desde req.user.empresaId)
   */
  async cambiarPin(dto: CambiarPinDto, empresaId: string): Promise<void> {
    // Verificar que el usuario pertenece a la misma empresa
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: dto.usuarioId,
        empresaId,
        activo: true,
      },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    // Hashear el PIN con bcrypt
    const hashPin = await bcrypt.hash(dto.nuevoPin, env.BCRYPT_SALT_ROUNDS);

    await prisma.usuario.update({
      where: { id: dto.usuarioId },
      data: { hashPin },
    });

    logger.info({
      mensaje: 'PIN actualizado',
      usuarioId: dto.usuarioId,
    });
  },

  // ================================================================
  // UTILIDADES PRIVADAS
  // ================================================================

  /**
   * Verifica que el usuario tenga permitido conectarse segun su horario laboral.
   * Solo aplica para CAJERO y REPARTIDOR. ADMIN no tiene restriccion.
   *
   * @param usuario - Datos del usuario con horarioInicio, horarioFin, diasLaborales
   * @throws ErrorAcceso si esta fuera de horario
   */
  verificarHorarioLaboral(usuario: {
    horarioInicio: string | null;
    horarioFin: string | null;
    diasLaborales: number[];
  }): void {
    // Si no tiene horario configurado, permitir acceso
    if (!usuario.horarioInicio || !usuario.horarioFin) return;

    const ahora = dayjs();
    const diaActual = ahora.day(); // 0=Domingo, 6=Sabado

    // Verificar dia laboral
    if (usuario.diasLaborales.length > 0 && !usuario.diasLaborales.includes(diaActual)) {
      throw new ErrorAcceso('No tiene acceso en este dia. Contacte al administrador');
    }

    // Verificar hora laboral
    const horaActual = ahora.format('HH:mm');
    if (horaActual < usuario.horarioInicio || horaActual > usuario.horarioFin) {
      throw new ErrorAcceso(
        `Acceso permitido de ${usuario.horarioInicio} a ${usuario.horarioFin}`,
      );
    }
  },
};
