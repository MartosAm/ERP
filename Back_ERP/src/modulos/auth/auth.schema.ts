/**
 * src/modulos/auth/auth.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod y tipos TypeScript para el modulo de autenticacion.
 *
 * Define la validacion de entrada para:
 * - Registro de usuario (solo ADMIN puede registrar)
 * - Login (correo + contrasena)
 * - Cambio de PIN de autorizacion
 *
 * Los tipos se infieren directamente de los schemas.
 * Un solo lugar para cambiar el contrato: schema y tipo se actualizan juntos.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

// ------------------------------------------------------------------
// Schema de registro
// ------------------------------------------------------------------

/**
 * Valida los datos para registrar un nuevo usuario.
 * Solo un ADMIN puede registrar usuarios nuevos.
 * El correo se normaliza a minusculas y se recorta.
 * La contrasena requiere minimo 8 caracteres, una mayuscula, una minuscula y un numero.
 */
export const RegistroSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  correo: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Formato de correo invalido')
    .trim()
    .toLowerCase(),
  contrasena: z
    .string({ required_error: 'La contrasena es obligatoria' })
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayuscula')
    .regex(/[a-z]/, 'Debe contener al menos una letra minuscula')
    .regex(/[0-9]/, 'Debe contener al menos un numero'),
  rol: z
    .enum(['ADMIN', 'CAJERO', 'REPARTIDOR'], {
      errorMap: () => ({ message: 'Rol invalido. Valores permitidos: ADMIN, CAJERO, REPARTIDOR' }),
    })
    .default('CAJERO'),
  telefono: z
    .string()
    .min(7, 'Telefono debe tener al menos 7 caracteres')
    .max(20, 'Telefono no puede exceder 20 caracteres')
    .optional(),
  horarioInicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato de horario invalido. Usar HH:MM')
    .optional(),
  horarioFin: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato de horario invalido. Usar HH:MM')
    .optional(),
  diasLaborales: z
    .array(z.number().int().min(0).max(6))
    .optional(),
});

// ------------------------------------------------------------------
// Schema de registro publico (auto-registro con empresa nueva)
// ------------------------------------------------------------------

/**
 * Valida los datos para el auto-registro publico.
 * Crea una empresa nueva y su primer usuario ADMIN.
 * No requiere autenticacion. Accesible desde la pantalla de login.
 */
export const RegistroPublicoSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  correo: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Formato de correo invalido')
    .trim()
    .toLowerCase(),
  contrasena: z
    .string({ required_error: 'La contrasena es obligatoria' })
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayuscula')
    .regex(/[a-z]/, 'Debe contener al menos una letra minuscula')
    .regex(/[0-9]/, 'Debe contener al menos un numero'),
  nombreEmpresa: z
    .string({ required_error: 'El nombre de la empresa es obligatorio' })
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(150, 'El nombre de la empresa no puede exceder 150 caracteres')
    .trim(),
  telefono: z
    .string()
    .min(7, 'Telefono debe tener al menos 7 caracteres')
    .max(20, 'Telefono no puede exceder 20 caracteres')
    .optional(),
});

// ------------------------------------------------------------------
// Schema de login
// ------------------------------------------------------------------

/**
 * Valida las credenciales de inicio de sesion.
 * El correo se normaliza a minusculas y se recorta.
 * La contrasena requiere minimo 8 caracteres.
 */
export const LoginSchema = z.object({
  correo: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Formato de correo invalido')
    .trim()
    .toLowerCase(),
  contrasena: z
    .string({ required_error: 'La contrasena es obligatoria' })
    .min(8, 'La contrasena debe tener al menos 8 caracteres'),
});

// ------------------------------------------------------------------
// Schema de cambio de PIN
// ------------------------------------------------------------------

/**
 * Valida el cambio de PIN de autorizacion en caja.
 * El PIN es un numero de 4 a 6 digitos.
 * Se requiere el ID del usuario al que se le cambia el PIN.
 */
export const CambiarPinSchema = z.object({
  usuarioId: z
    .string({ required_error: 'El ID del usuario es obligatorio' })
    .cuid('ID de usuario invalido'),
  nuevoPin: z
    .string({ required_error: 'El nuevo PIN es obligatorio' })
    .regex(/^\d{4,6}$/, 'El PIN debe ser de 4 a 6 digitos numericos'),
});

// ------------------------------------------------------------------
// Tipos inferidos desde los schemas
// ------------------------------------------------------------------

/** Datos validados para iniciar sesion */
export type LoginDto = z.infer<typeof LoginSchema>;

/** Datos validados para registrar un usuario (ADMIN-only, usuario interno) */
export type RegistroDto = z.infer<typeof RegistroSchema>;

/** Datos validados para auto-registro publico (empresa + primer usuario) */
export type RegistroPublicoDto = z.infer<typeof RegistroPublicoSchema>;

/** Datos validados para cambiar el PIN de un usuario */
export type CambiarPinDto = z.infer<typeof CambiarPinSchema>;
