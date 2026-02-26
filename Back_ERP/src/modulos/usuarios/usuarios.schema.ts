/**
 * src/modulos/usuarios/usuarios.schema.ts
 * ------------------------------------------------------------------
 * Schemas Zod para gestion de usuarios por parte del ADMIN.
 *
 * Funcionalidades:
 * - Actualizar datos basicos (nombre, telefono, avatar)
 * - Asignar horario laboral (inicio, fin, dias)
 * - Activar/desactivar (inhabilitar acceso)
 * - Listar y filtrar usuarios de la empresa
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

// ------------------------------------------------------------------
// Actualizar usuario (datos generales + horario)
// ------------------------------------------------------------------

export const ActualizarUsuarioSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100)
    .trim()
    .optional(),
  telefono: z
    .string()
    .min(7)
    .max(20)
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .url('URL invalida')
    .optional()
    .nullable(),
  rol: z
    .enum(['ADMIN', 'CAJERO', 'REPARTIDOR'], {
      errorMap: () => ({ message: 'Rol invalido' }),
    })
    .optional(),
});

// ------------------------------------------------------------------
// Asignar horario laboral
// ------------------------------------------------------------------

/**
 * Define el horario y dias permitidos para conectarse.
 * Si se envia null en horarioInicio/horarioFin, se elimina la restriccion.
 */
export const AsignarHorarioSchema = z.object({
  horarioInicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato invalido. Usar HH:MM (ej: 08:00)')
    .nullable(),
  horarioFin: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato invalido. Usar HH:MM (ej: 18:00)')
    .nullable(),
  diasLaborales: z
    .array(
      z.number().int().min(0, 'Dia invalido (0-6)').max(6, 'Dia invalido (0-6)'),
    )
    .max(7, 'Maximo 7 dias')
    .default([]),
}).refine(
  (data) => {
    // Si se configura horario, ambos campos deben existir
    if (data.horarioInicio && !data.horarioFin) return false;
    if (!data.horarioInicio && data.horarioFin) return false;
    return true;
  },
  { message: 'Debe indicar tanto horarioInicio como horarioFin, o dejar ambos null' },
).refine(
  (data) => {
    // Si ambos existen, inicio debe ser menor a fin
    if (data.horarioInicio && data.horarioFin) {
      return data.horarioInicio < data.horarioFin;
    }
    return true;
  },
  { message: 'horarioInicio debe ser anterior a horarioFin' },
);

// ------------------------------------------------------------------
// Cambiar estado (activar / desactivar)
// ------------------------------------------------------------------

export const CambiarEstadoSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' }),
  motivo: z
    .string()
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(500)
    .optional(),
});

// ------------------------------------------------------------------
// Filtros de listado
// ------------------------------------------------------------------

export const FiltroUsuariosSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  rol: z.enum(['ADMIN', 'CAJERO', 'REPARTIDOR']).optional(),
  activo: z.enum(['true', 'false']).optional(),
  buscar: z.string().optional(),
});

// ------------------------------------------------------------------
// Tipos inferidos
// ------------------------------------------------------------------

export type ActualizarUsuarioDto = z.infer<typeof ActualizarUsuarioSchema>;
export type AsignarHorarioDto = z.infer<typeof AsignarHorarioSchema>;
export type CambiarEstadoDto = z.infer<typeof CambiarEstadoSchema>;
export type FiltroUsuariosDto = z.infer<typeof FiltroUsuariosSchema>;
