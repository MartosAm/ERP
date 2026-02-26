/**
 * src/modulos/auth/auth.controller.ts
 * ------------------------------------------------------------------
 * Capa HTTP del modulo de autenticacion.
 *
 * Responsabilidad unica: extraer datos del request, llamar al service,
 * y retornar la respuesta HTTP con el formato ApiResponse.
 *
 * No contiene logica de negocio. No accede a Prisma directamente.
 * Los errores se propagan automaticamente via asyncHandler -> manejarErrores.
 * ------------------------------------------------------------------
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../../compartido/respuesta';
import { AuthService } from './auth.service';

export const AuthController = {

  /**
   * POST /api/v1/auth/registro
   * Registra un nuevo usuario en la empresa.
   * Solo ADMIN. Hashea la contrasena con bcrypt antes de guardar.
   */
  registrar: async (req: Request, res: Response): Promise<void> => {
    const usuario = await AuthService.registrar(req.body, req.user.empresaId);

    res.status(201).json(ApiResponse.ok(usuario, 'Usuario registrado exitosamente'));
  },

  /**
   * POST /api/v1/auth/login
   * Inicia sesion con correo y contrasena.
   * No requiere autenticacion (ruta publica).
   */
  login: async (req: Request, res: Response): Promise<void> => {
    // Extraer IP y User-Agent para registro de auditoria en la sesion
    const ip = req.ip ?? req.socket.remoteAddress;
    const agenteUsuario = req.headers['user-agent'];

    const resultado = await AuthService.login(req.body, ip, agenteUsuario);

    res.json(ApiResponse.ok(resultado, 'Inicio de sesion exitoso'));
  },

  /**
   * POST /api/v1/auth/logout
   * Cierra la sesion activa del usuario.
   * Requiere autenticacion.
   */
  logout: async (req: Request, res: Response): Promise<void> => {
    await AuthService.logout(req.user.sesionId);

    res.json(ApiResponse.ok(null, 'Sesion cerrada exitosamente'));
  },

  /**
   * GET /api/v1/auth/perfil
   * Retorna los datos del usuario autenticado.
   * Requiere autenticacion. Solo datos no sensibles.
   */
  perfil: async (req: Request, res: Response): Promise<void> => {
    const usuario = await AuthService.obtenerPerfil(
      req.user.usuarioId,
      req.user.empresaId,
    );

    res.json(ApiResponse.ok(usuario));
  },

  /**
   * POST /api/v1/auth/cambiar-pin
   * Cambia el PIN de autorizacion de un usuario.
   * Solo ADMIN. El PIN se usa para aprobar operaciones en caja.
   */
  cambiarPin: async (req: Request, res: Response): Promise<void> => {
    await AuthService.cambiarPin(req.body, req.user.empresaId);

    res.json(ApiResponse.ok(null, 'PIN actualizado exitosamente'));
  },
};
