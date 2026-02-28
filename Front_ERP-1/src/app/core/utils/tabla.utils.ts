/**
 * core/utils/tabla.utils.ts
 * ------------------------------------------------------------------
 * Helpers para construir parámetros de query (paginación, filtros,
 * ordenamiento) usados por los servicios de listado paginado.
 * ------------------------------------------------------------------
 */
import type { PaginacionMeta } from '../models/api.model';

/** Parámetros estándar de listado paginado */
export interface FiltrosPaginados {
  pagina?: number;
  limite?: number;
  buscar?: string;
  ordenarPor?: string;
  direccion?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

/**
 * Convierte FiltrosPaginados a Record<string, string|number|boolean>
 * limpiando valores undefined/null/vacíos para el ApiService.
 */
export function construirParams(
  filtros: FiltrosPaginados,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== null && v !== '') {
      params[k] = v;
    }
  }
  return params;
}

/** Verifica si hay página siguiente */
export function tieneSiguiente(meta: PaginacionMeta | null): boolean {
  if (!meta) return false;
  return meta.pagina < meta.totalPaginas;
}

/** Verifica si hay página anterior */
export function tieneAnterior(meta: PaginacionMeta | null): boolean {
  if (!meta) return false;
  return meta.pagina > 1;
}

/** Genera texto descriptivo de paginación: "Mostrando 1-10 de 50" */
export function textoPaginacion(meta: PaginacionMeta | null): string {
  if (!meta || meta.total === 0) return 'Sin resultados';
  const inicio = (meta.pagina - 1) * meta.limite + 1;
  const fin = Math.min(meta.pagina * meta.limite, meta.total);
  return `Mostrando ${inicio}–${fin} de ${meta.total}`;
}

/** Genera array de números de página para paginador UI */
export function rangosPagina(meta: PaginacionMeta | null, maxVisible = 5): number[] {
  if (!meta || meta.totalPaginas <= 1) return [];
  const total = meta.totalPaginas;
  const actual = meta.pagina;
  const mitad = Math.floor(maxVisible / 2);

  let inicio = Math.max(1, actual - mitad);
  let fin = Math.min(total, inicio + maxVisible - 1);

  if (fin - inicio + 1 < maxVisible) {
    inicio = Math.max(1, fin - maxVisible + 1);
  }

  const paginas: number[] = [];
  for (let i = inicio; i <= fin; i++) {
    paginas.push(i);
  }
  return paginas;
}
