/**
 * src/config/cache.ts
 * ------------------------------------------------------------------
 * Cache in-memory para recursos que se leen frecuentemente y cambian poco.
 * Reduce la carga sobre PostgreSQL en listados del catalogo y el dashboard.
 *
 * Se invalida manualmente en cada mutacion (create/update/delete) del
 * recurso cacheado. No cachear sesiones activas ni stock en tiempo real.
 *
 * Clave de cache: "{modulo}:{companyId}:{hash-de-filtros}"
 * Ejemplo: "productos:cjxyz123:p1-l20-catABC"
 * ------------------------------------------------------------------
 */

import NodeCache from 'node-cache';

/**
 * Instancia unica de NodeCache.
 * - stdTTL: 0 = sin expiracion automatica (se controla por modulo).
 * - checkperiod: cada 120s revisa claves expiradas.
 * - useClones: false = retorna referencia directa (mejor rendimiento).
 */
export const cache = new NodeCache({
  stdTTL: 0,
  checkperiod: 120,
  useClones: false,
});

/**
 * TTL (en segundos) por tipo de recurso.
 * Recursos que cambian poco tienen TTL mas largo.
 * Recursos cercanos al tiempo real tienen TTL corto.
 */
export const CacheTTL = {
  CATEGORIAS: 300,   // 5 minutos
  PRODUCTOS: 120,    // 2 minutos
  ALMACENES: 600,    // 10 minutos
  PROVEEDORES: 300,  // 5 minutos
  CLIENTES: 120,     // 2 minutos
  REPORTES: 60,      // 1 minuto
  STOCK_BAJO: 30,    // 30 segundos
} as const;

/**
 * Invalida todas las claves de cache que empiecen con el prefijo dado.
 * Llamar en cada mutacion del recurso correspondiente.
 *
 * @param prefijo - Prefijo del modulo. Ejemplo: "productos", "categorias"
 */
export const invalidarCacheModulo = (prefijo: string): void => {
  const claves = cache.keys().filter((k) => k.startsWith(prefijo));
  if (claves.length > 0) cache.del(claves);
};
