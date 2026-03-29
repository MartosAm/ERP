import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../app';

describe('Smoke API - endpoints criticos', () => {
  it('GET /api/health responde 200 y formato ApiResponse', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.datos.estado).toBe('activo');
    expect(typeof res.body.datos.timestamp).toBe('string');
  });

  it('GET /api/v1/productos sin token responde 401', async () => {
    const res = await request(app).get('/api/v1/productos');

    expect(res.status).toBe(401);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.codigo).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/auth/login con payload invalido responde 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'correo-invalido', contrasena: '123' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.codigo).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/registro-publico sin idempotency key responde 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/registro-publico')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.codigo).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('POST /api/v1/auth/login con content-type no JSON responde 415', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'text/plain')
      .send('no-json');

    expect(res.status).toBe(415);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.codigo).toBe('CONTENT_TYPE_INVALIDO');
  });

  it('Ruta inexistente responde 404 estandar', async () => {
    const res = await request(app).get('/api/v1/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.codigo).toBe('NOT_FOUND');
  });
});