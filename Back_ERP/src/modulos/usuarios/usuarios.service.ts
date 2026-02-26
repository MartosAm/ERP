/**
 * src/modulos/usuarios/usuarios.service.ts
 * ------------------------------------------------------------------
 * Gestion de usuarios por parte del ADMIN.
 *
 * Operaciones:
 * - Listar usuarios de la empresa con filtros
 * - Obtener detalle de un usuario
 * - Actualizar datos basicos
 * - Asignar/modificar horario laboral y dias
 * - Activar/desactivar usuario (inhabilitar acceso)
 *
 * Al desactivar un usuario:
 * - Se marcan todas sus sesiones activas como inactivas
 * - El middleware autenticar.ts rechazara sus proximas peticiones
 * - No puede hacer login mientras este inactivo
 * ------------------------------------------------------------------
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo } from '../../config/cache';
import { paginar, construirMeta } from '../../compartido/paginacion';
import { ErrorNoEncontrado, ErrorNegocio } from '../../compartido/errores';
import { logger } from '../../compartido/logger';
import type {
  ActualizarUsuarioDto,
  AsignarHorarioDto,
  CambiarEstadoDto,
  FiltroUsuariosDto,
} from './usuarios.schema';

const MODULO = 'USUARIOS';

/** Campos seguros para seleccionar (sin hash, sin pin, sin intentos) */
const SELECT_SEGURO = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  telefono: true,
  avatarUrl: true,
  horarioInicio: true,
  horarioFin: true,
  diasLaborales: true,
  ultimoLoginEn: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

export const UsuariosService = {

  /**
   * Lista usuarios de la empresa con filtros y paginacion.
   */
  async listar(filtros: FiltroUsuariosDto, empresaId: string) {
    const cacheKey = `${MODULO}:listar:${empresaId}:${JSON.stringify(filtros)}`;
    const cached = cache.get<{ datos: unknown; meta: unknown }>(cacheKey);
    if (cached) return cached;

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };

    const where: Prisma.UsuarioWhereInput = { empresaId };

    if (filtros.rol) {
      where.rol = filtros.rol;
    }

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo === 'true';
    }

    if (filtros.buscar) {
      where.OR = [
        { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
        { correo: { contains: filtros.buscar, mode: 'insensitive' } },
        { telefono: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }

    const [datos, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        ...paginar(parametros),
        select: {
          ...SELECT_SEGURO,
          _count: {
            select: {
              sesiones: { where: { activo: true } },
              ordenesCreadas: true,
            },
          },
        },
        orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
      }),
      prisma.usuario.count({ where }),
    ]);

    const meta = construirMeta(total, parametros);
    const resultado = { datos, meta };

    cache.set(cacheKey, resultado, CacheTTL.CATEGORIAS); // 300s
    return resultado;
  },

  /**
   * Obtiene un usuario por ID con informacion detallada.
   */
  async obtenerPorId(usuarioId: string, empresaId: string) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
      select: {
        ...SELECT_SEGURO,
        intentosFallidos: true,
        bloqueadoHasta: true,
        creadoPorId: true,
        _count: {
          select: {
            sesiones: { where: { activo: true } },
            ordenesCreadas: true,
            turnosCaja: true,
            entregas: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    return usuario;
  },

  /**
   * Actualiza datos basicos de un usuario (nombre, telefono, avatar, rol).
   */
  async actualizar(usuarioId: string, dto: ActualizarUsuarioDto, empresaId: string) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.rol !== undefined && { rol: dto.rol }),
      },
      select: SELECT_SEGURO,
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Usuario actualizado',
      usuarioId,
      campos: Object.keys(dto),
    });

    return actualizado;
  },

  /**
   * Asigna o modifica el horario laboral de un usuario.
   *
   * - Si horarioInicio/horarioFin son null -> se elimina la restriccion
   * - diasLaborales vacio -> todos los dias permitidos
   * - diasLaborales: [1,2,3,4,5] -> solo Lun-Vie
   *
   * Los cambios aplican en el proximo login del usuario.
   */
  async asignarHorario(usuarioId: string, dto: AsignarHorarioDto, empresaId: string) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    if (usuario.rol === 'ADMIN') {
      throw new ErrorNegocio('No se puede asignar horario a un ADMIN');
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        horarioInicio: dto.horarioInicio,
        horarioFin: dto.horarioFin,
        diasLaborales: dto.diasLaborales,
      },
      select: SELECT_SEGURO,
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Horario laboral asignado',
      usuarioId,
      horarioInicio: dto.horarioInicio,
      horarioFin: dto.horarioFin,
      diasLaborales: dto.diasLaborales,
    });

    return actualizado;
  },

  /**
   * Activa o desactiva un usuario.
   *
   * Al desactivar:
   * - Todas sus sesiones activas se invalidan inmediatamente
   * - No puede hacer login
   * - Sus proximas peticiones seran rechazadas por autenticar.ts
   *
   * Al reactivar:
   * - Puede volver a hacer login normalmente
   * - Se resetean intentos fallidos y bloqueo
   */
  async cambiarEstado(
    usuarioId: string,
    dto: CambiarEstadoDto,
    adminId: string,
    empresaId: string,
  ) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    // No puede desactivarse a si mismo
    if (usuarioId === adminId) {
      throw new ErrorNegocio('No puedes desactivar tu propia cuenta');
    }

    // Si ya tiene el estado deseado, no hacer nada
    if (usuario.activo === dto.activo) {
      throw new ErrorNegocio(
        `El usuario ya esta ${dto.activo ? 'activo' : 'inactivo'}`,
      );
    }

    // Transaccion: actualizar usuario + invalidar sesiones si se desactiva
    const resultado = await prisma.$transaction(async (tx) => {
      const datosActualizacion: Prisma.UsuarioUpdateInput = {
        activo: dto.activo,
      };

      if (dto.activo) {
        // Al reactivar: resetear bloqueo e intentos
        datosActualizacion.intentosFallidos = 0;
        datosActualizacion.bloqueadoHasta = null;
      } else {
        // Al desactivar: cerrar todas las sesiones activas
        await tx.sesion.updateMany({
          where: { usuarioId, activo: true },
          data: { activo: false },
        });
      }

      return tx.usuario.update({
        where: { id: usuarioId },
        data: datosActualizacion,
        select: SELECT_SEGURO,
      });
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: dto.activo ? 'Usuario reactivado' : 'Usuario desactivado',
      usuarioId,
      adminId,
      motivo: dto.motivo ?? 'Sin motivo especificado',
    });

    return resultado;
  },

  /**
   * Cierra forzosamente todas las sesiones activas de un usuario.
   * Util cuando se detecta acceso sospechoso.
   */
  async cerrarSesiones(usuarioId: string, empresaId: string) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });

    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado');
    }

    const resultado = await prisma.sesion.updateMany({
      where: { usuarioId, activo: true },
      data: { activo: false },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Sesiones cerradas forzosamente',
      usuarioId,
      sesionesCerradas: resultado.count,
    });

    return { sesionesCerradas: resultado.count };
  },
};
