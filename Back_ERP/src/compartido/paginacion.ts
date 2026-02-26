/**
 * src/compartido/paginacion.ts
 * ------------------------------------------------------------------
 * Utilidades de paginacion centralizadas.
 * Calcula skip/take para Prisma y construye el objeto MetaPaginacion
 * que el frontend Angular usa para renderizar controles de paginacion.
 *
 * Importar en todos los services que retornen listas paginadas.
 * ------------------------------------------------------------------
 */

import { MetaPaginacion } from './respuesta';

/** Parametros de paginacion que llegan desde el schema Zod del query string */
export interface ParametrosPaginacion {
  pagina: number;
  limite: number;
}

/**
 * Convierte pagina/limite a skip/take de Prisma.
 *
 * @param p - Parametros de paginacion validados
 * @returns Objeto con skip y take para Prisma findMany
 *
 * @example
 * // pagina 2, limite 20 => skip 20, take 20
 * prisma.product.findMany({ ...paginar({ pagina: 2, limite: 20 }) })
 */
export const paginar = (p: ParametrosPaginacion) => ({
  skip: (p.pagina - 1) * p.limite,
  take: p.limite,
});

/**
 * Construye el objeto MetaPaginacion a partir del total de registros
 * y los parametros de paginacion usados en la consulta.
 *
 * @param total - Total de registros que cumplen el filtro (de prisma.count)
 * @param p - Parametros de paginacion usados
 * @returns MetaPaginacion para incluir en ApiResponse.ok()
 */
export const construirMeta = (total: number, p: ParametrosPaginacion): MetaPaginacion => {
  const totalPaginas = Math.ceil(total / p.limite);
  return {
    total,
    pagina: p.pagina,
    limite: p.limite,
    totalPaginas,
    tieneSiguiente: p.pagina < totalPaginas,
    tieneAnterior: p.pagina > 1,
  };
};
