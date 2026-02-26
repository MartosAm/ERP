/**
 * src/modulos/auth/auth.routes.ts
 * ------------------------------------------------------------------
 * Rutas del modulo de autenticacion.
 *
 * Define los endpoints y aplica los middlewares correspondientes:
 * - login: publico + rate limiting estricto (5 intentos/15min)
 * - logout: requiere autenticacion
 * - perfil: requiere autenticacion
 * - cambiar-pin: requiere autenticacion + rol ADMIN
 *
 * Documentacion Swagger incluida via JSDoc para cada endpoint.
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { asyncHandler } from '../../compartido/asyncHandler';
import { autenticar } from '../../middlewares/autenticar';
import { requerirRol } from '../../middlewares/requerirRol';
import { validar } from '../../middlewares/validar';
import { limitarLogin } from '../../middlewares/limitarRates';
import { AuthController } from './auth.controller';
import { LoginSchema, RegistroSchema, CambiarPinSchema } from './auth.schema';

const router = Router();

// ------------------------------------------------------------------
// Rutas publicas (no requieren token)
// ------------------------------------------------------------------

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesion
 *     description: |
 *       Autentica un usuario con correo y contrasena.
 *       Retorna un token JWT y datos basicos del usuario.
 *       Despues de 5 intentos fallidos, la cuenta se bloquea 30 minutos.
 *     tags: [Autenticacion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, contrasena]
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: admin@empresa.com
 *               contrasena:
 *                 type: string
 *                 minLength: 8
 *                 example: MiContrasena123
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna token y datos del usuario.
 *       401:
 *         description: Credenciales invalidas.
 *       403:
 *         description: Cuenta bloqueada o fuera de horario laboral.
 *       429:
 *         description: Demasiados intentos. Rate limit alcanzado.
 */
router.post(
  '/login',
  limitarLogin,
  validar(LoginSchema),
  asyncHandler(AuthController.login),
);

// ------------------------------------------------------------------
// Rutas protegidas (requieren token valido)
// ------------------------------------------------------------------

router.use(autenticar);

/**
 * @openapi
 * /auth/registro:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: |
 *       Solo ADMIN. Crea un nuevo usuario en la empresa.
 *       La contrasena se hashea con bcrypt antes de almacenarse.
 *       Requiere minimo 8 caracteres, una mayuscula, una minuscula y un numero.
 *     tags: [Autenticacion]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, correo, contrasena]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Lopez
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: juan@empresa.com
 *               contrasena:
 *                 type: string
 *                 minLength: 8
 *                 example: MiContrasena123
 *               rol:
 *                 type: string
 *                 enum: [ADMIN, CAJERO, REPARTIDOR]
 *                 default: CAJERO
 *               telefono:
 *                 type: string
 *                 example: "5512345678"
 *               horarioInicio:
 *                 type: string
 *                 example: "08:00"
 *               horarioFin:
 *                 type: string
 *                 example: "18:00"
 *               diasLaborales:
 *                 type: array
 *                 items: { type: integer, minimum: 0, maximum: 6 }
 *                 example: [1,2,3,4,5]
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente.
 *       400:
 *         description: Datos de entrada invalidos.
 *       403:
 *         description: Solo ADMIN puede registrar usuarios.
 *       409:
 *         description: Ya existe un usuario con ese correo.
 */
router.post(
  '/registro',
  requerirRol('ADMIN'),
  validar(RegistroSchema),
  asyncHandler(AuthController.registrar),
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesion
 *     description: Invalida la sesion activa del usuario en la base de datos.
 *     tags: [Autenticacion]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Sesion cerrada exitosamente.
 *       401:
 *         description: Token invalido o sesion expirada.
 */
router.post('/logout', asyncHandler(AuthController.logout));

/**
 * @openapi
 * /auth/perfil:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     description: |
 *       Retorna los datos del usuario autenticado.
 *       No incluye datos sensibles (contrasena, PIN, intentos fallidos).
 *     tags: [Autenticacion]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Datos del perfil del usuario.
 *       401:
 *         description: Token invalido o sesion expirada.
 */
router.get('/perfil', asyncHandler(AuthController.perfil));

/**
 * @openapi
 * /auth/cambiar-pin:
 *   post:
 *     summary: Cambiar PIN de autorizacion
 *     description: |
 *       Solo ADMIN. Cambia el PIN de autorizacion en caja de un usuario.
 *       El PIN se usa para aprobar descuentos y cancelaciones.
 *     tags: [Autenticacion]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuarioId, nuevoPin]
 *             properties:
 *               usuarioId:
 *                 type: string
 *                 example: cjxyz123abc
 *               nuevoPin:
 *                 type: string
 *                 pattern: '^\d{4,6}$'
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: PIN actualizado exitosamente.
 *       403:
 *         description: Solo ADMIN puede cambiar PINs.
 *       404:
 *         description: Usuario no encontrado.
 */
router.post(
  '/cambiar-pin',
  requerirRol('ADMIN'),
  validar(CambiarPinSchema),
  asyncHandler(AuthController.cambiarPin),
);

export default router;
