/**
 * src/middlewares/autenticar.ts
 * ------------------------------------------------------------------
 * Middleware de autenticacion JWT con validacion de sesion en BD.
 *
 * Verifica en cada request protegido:
 * 1. Que el header Authorization contiene un Bearer token valido.
 * 2. Que el token no ha expirado ni ha sido manipulado.
 * 3. Que la sesion asociada sigue activa en la base de datos.
 * 4. Que el usuario no ha sido desactivado por el ADMIN.
 *
 * Si el ADMIN desactiva un usuario, su sesion queda invalida en el
 * siguiente request -- sin necesidad de revocar el token manualmente.
 * ------------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ErrorNoAutorizado, ErrorAcceso } from '../compartido/errores';
import { JwtPayload } from '../tipos/express';

/**
 * Middleware que protege rutas requiriendo un JWT valido.
 * Pobla req.user con el payload del token para uso posterior.
 *
 * Validaciones en cada request:
 * 1. Token presente y con firma valida
 * 2. Sesion activa en BD
 * 3. Usuario activo (no desactivado por ADMIN)
 * 4. Horario laboral vigente (CAJERO/REPARTIDOR)
 */
export const autenticar = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  // 1. Extraer token del header Authorization
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ErrorNoAutorizado('Token requerido'));
  }

  const token = header.split(' ')[1]!;
  let payload: JwtPayload;

  // 2. Verificar firma y expiracion del JWT
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return next(new ErrorNoAutorizado('Token invalido o expirado'));
  }

  // 3. Validar sesion activa y estado del usuario en BD
  const sesion = await prisma.sesion.findUnique({
    where: { id: payload.sesionId },
    select: {
      activo: true,
      usuario: {
        select: {
          activo: true,
          rol: true,
          horarioInicio: true,
          horarioFin: true,
          diasLaborales: true,
        },
      },
    },
  });

  if (!sesion?.activo || !sesion.usuario.activo) {
    return next(new ErrorNoAutorizado('Sesion invalida o usuario inactivo'));
  }

  // 4. Verificar horario laboral en cada peticion (CAJERO/REPARTIDOR)
  // Esto asegura que si el ADMIN cambia el horario, aplica inmediatamente
  const { usuario } = sesion;
  if (usuario.rol !== 'ADMIN' && usuario.horarioInicio && usuario.horarioFin) {
    const ahora = dayjs();
    const diaActual = ahora.day(); // 0=Domingo, 6=Sabado

    // Verificar dia laboral
    if (usuario.diasLaborales.length > 0 && !usuario.diasLaborales.includes(diaActual)) {
      return next(new ErrorAcceso('No tiene acceso en este dia. Contacte al administrador'));
    }

    // Verificar hora laboral
    const horaActual = ahora.format('HH:mm');
    if (horaActual < usuario.horarioInicio || horaActual > usuario.horarioFin) {
      return next(
        new ErrorAcceso(
          `Acceso permitido de ${usuario.horarioInicio} a ${usuario.horarioFin}`,
        ),
      );
    }
  }

  // 5. Inyectar payload en el request para uso en controllers
  req.user = payload;
  next();
};
