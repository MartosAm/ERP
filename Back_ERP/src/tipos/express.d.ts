/**
 * src/tipos/express.d.ts
 * ------------------------------------------------------------------
 * Extension de tipos de Express para incluir req.user.
 * El middleware autenticar.ts pobla este campo con el payload del JWT
 * tras verificar el token y validar la sesion en BD.
 *
 * Esto permite que TypeScript conozca la forma de req.user en
 * controllers sin necesidad de casteos manuales.
 * ------------------------------------------------------------------
 */

/**
 * Payload contenido en el JWT.
 * Estos campos se establecen al hacer login y se verifican en cada request.
 * Los nombres estan en espanol para consistencia con el schema Prisma.
 */
export interface JwtPayload {
  /** ID del usuario en la tabla usuarios */
  usuarioId: string;
  /** ID de la empresa/tenant del usuario */
  empresaId: string;
  /** Rol del usuario: ADMIN, CAJERO o REPARTIDOR */
  rol: string;
  /** ID de la sesion activa en la tabla sesiones */
  sesionId: string;
}

// Extender la interfaz Request de Express para incluir el payload JWT
declare global {
  namespace Express {
    interface Request {
      /** Payload del JWT. Disponible solo en rutas protegidas por autenticar. */
      user: JwtPayload;
    }
  }
}
