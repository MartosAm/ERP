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
 * Sanitiza recursivamente todos los campos string de un objeto o array.
 * - Strings: se limpian con xss()
 * - Arrays: se recorren recursivamente
 * - Objetos anidados: se recorren recursivamente
 * - Otros tipos (number, boolean, null, etc.): se mantienen sin modificar
 *
 * @param obj - Objeto con campos del usuario (DTO validado por Zod)
 * @returns Copia del objeto con todos los strings sanitizados (recursivo)
 */
export const sanitizarObjeto = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, sanitizarValor(v)]),
  ) as T;

/** Sanitiza un valor de forma recursiva segun su tipo */
function sanitizarValor(v: unknown): unknown {
  if (typeof v === 'string') return sanitizarString(v);
  if (Array.isArray(v)) return v.map(sanitizarValor);
  if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
    return sanitizarObjeto(v as Record<string, unknown>);
  }
  return v;
}
