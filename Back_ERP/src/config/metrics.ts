/**
 * src/config/metrics.ts
 * ------------------------------------------------------------------
 * Metricas Prometheus para observabilidad operativa del backend.
 *
 * Incluye:
 * - Metricas default de proceso/nodejs
 * - Conteo de requests HTTP por metodo/ruta/status
 * - Histograma de latencia HTTP por metodo/ruta/status
 * - Endpoint /api/metrics controlado por METRICS_ENABLED/TOKEN
 * ------------------------------------------------------------------
 */

import client from 'prom-client';
import type { NextFunction, Request, Response } from 'express';
import { env } from './env';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'erp_' });

const httpRequestsTotal = new client.Counter({
  name: 'erp_http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'erp_http_request_duration_seconds',
  help: 'Duracion de requests HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

function rutaLabel(req: Request): string {
  // Evita cardinalidad alta usando template de ruta cuando existe.
  if (req.baseUrl && req.route?.path) {
    return `${req.baseUrl}${String(req.route.path)}`;
  }

  if (req.route?.path) {
    return String(req.route.path);
  }

  return req.path || 'unknown';
}

export const metricsHabilitadas = env.METRICS_ENABLED;

export function medirMetricasHttp(req: Request, res: Response, next: NextFunction): void {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const fin = process.hrtime.bigint();
    const duracionSeg = Number(fin - inicio) / 1_000_000_000;

    const labels = {
      method: req.method,
      route: rutaLabel(req),
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels, 1);
    httpRequestDuration.observe(labels, duracionSeg);
  });

  next();
}

export function autorizarMetricas(req: Request, res: Response, next: NextFunction): void {
  if (!env.METRICS_TOKEN) {
    return next();
  }

  const auth = req.header('authorization') || '';
  const tokensPermitidos = [env.METRICS_TOKEN, env.METRICS_TOKEN_PREVIOUS]
    .filter(Boolean)
    .map((token) => `Bearer ${token}`);

  if (!tokensPermitidos.includes(auth)) {
    res.status(401).json({ exito: false, error: { codigo: 'UNAUTHORIZED', mensaje: 'Token de metricas invalido' } });
    return;
  }

  next();
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
}
