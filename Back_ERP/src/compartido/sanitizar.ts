/**
 * src/compartido/sanitizar.ts
 * ------------------------------------------------------------------
 * Funciones de sanitizacion para prevenir XSS almacenado.
 * Prisma parametriza queries y previene inyeccion SQL.
 * xss() previene adicionalmente el almacenamiento de scripts
 * en campos de texto libre (nombres, descripciones, notas).
 *
 * Llamar sanitizarObjeto(dto) antes de todo prisma.create() y
 * prisma.update() que persista strings de usuario.
 * ------------------------------------------------------------------
 */

import xss from 'xss';

/**
 * Sanitiza un string individual: elimina espacios al inicio/final
 * y remueve cualquier contenido HTML/JS potencialmente malicioso.
 *
 * @param valor - String de entrada del usuario
 * @returns String limpio y seguro para persistir
 */
export const sanitizarString = (valor: string): string => xss(valor.trim());

/**
 * Sanitiza todos los campos string de un objeto.
 * Los campos no-string se mantienen sin modificar.
 * Util para limpiar DTOs completos antes de enviarlos a Prisma.
 *
 * @param obj - Objeto con campos del usuario (DTO validado por Zod)
 * @returns Copia del objeto con todos los strings sanitizados
 */
export const sanitizarObjeto = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      typeof v === 'string' ? sanitizarString(v) : v,
    ]),
  ) as T;
