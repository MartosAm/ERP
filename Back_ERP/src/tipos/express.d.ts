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
 */
export interface JwtPayload {
  /** ID del usuario en la tabla User */
  userId: string;
  /** ID de la empresa/tenant del usuario */
  companyId: string;
  /** Rol del usuario: ADMIN, CAJERO o REPARTIDOR */
  role: string;
  /** ID de la sesion activa en la tabla Session */
  sessionId: string;
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
