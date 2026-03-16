/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import {
  requerirIdempotencia,
  limpiarCacheIdempotenciaParaTests,
  sembrarEntradaIdempotenciaParaTests,
} from './idempotencia';

function crearApp() {
  const app = express();
  app.use(express.json());

  let contador = 0;

  app.post(
    '/ventas',
    requerirIdempotencia({ scope: 'ordenes:crear', ttlSegundos: 60, requerido: true }),
    async (req, res) => {
      if (req.body?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, req.body.delayMs));
      }
      contador += 1;
      res.status(201).json({ exito: true, contador, body: req.body });
    },
  );

  return { app };
}

describe('idempotencia middleware', () => {
  beforeEach(() => {
    limpiarCacheIdempotenciaParaTests();
  });

  it('rechaza si falta X-Idempotency-Key cuando es requerido', async () => {
    const { app } = crearApp();

    const res = await request(app)
      .post('/ventas')
      .send({ monto: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('reproduce misma respuesta para misma key y mismo payload', async () => {
    const { app } = crearApp();

    const primero = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-123')
      .send({ monto: 100 });

    const segundo = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-123')
      .send({ monto: 100 });

    expect(primero.status).toBe(201);
    expect(segundo.status).toBe(201);
    expect(segundo.headers['x-idempotency-replayed']).toBe('true');
    expect(segundo.body.contador).toBe(1);
    expect(segundo.body).toEqual(primero.body);
  });

  it('rechaza reuso de key con payload diferente', async () => {
    const { app } = crearApp();

    await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-abc')
      .send({ monto: 100 });

    const res = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-abc')
      .send({ monto: 200 });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('rechaza si la idempotency key supera longitud maxima', async () => {
    const { app } = crearApp();
    const keyLarga = 'k'.repeat(129);

    const res = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', keyLarga)
      .send({ monto: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('rechaza cuando existe operacion en progreso con misma key y huella', async () => {
    const { app } = crearApp();
    const payload = { monto: 100 };
    const huella = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          method: 'POST',
          path: '/ventas',
          query: {},
          body: payload,
          usuarioId: null,
          empresaId: null,
        }),
      )
      .digest('hex');

    sembrarEntradaIdempotenciaParaTests({
      scope: 'ordenes:crear',
      key: 'key-en-proceso',
      entrada: { estado: 'PENDIENTE', huella },
    });

    const res = await request(app)
      .post('/ventas')
      .set('X-Idempotency-Key', 'key-en-proceso')
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_IN_PROGRESS');
  });

});
