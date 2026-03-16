/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import {
  asignarRequestId,
  medirTiempoRespuesta,
  headersSeguridad,
  validarContentType,
  ocultarTecnologia,
} from './seguridad';

describe('middleware seguridad', () => {
  it('asignarRequestId agrega header y lo expone en respuesta', async () => {
    const app = express();
    app.use(asignarRequestId);
    app.get('/id', (req, res) => {
      res.json({ requestId: req.headers['x-request-id'] });
    });

    const res = await request(app).get('/id');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('medirTiempoRespuesta agrega X-Response-Time', async () => {
    const app = express();
    app.use(medirTiempoRespuesta);
    app.get('/ping', async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      res.json({ ok: true });
    });

    const res = await request(app).get('/ping');

    expect(res.status).toBe(200);
    expect(res.headers['x-response-time']).toMatch(/ms$/);
  });

  it('headersSeguridad agrega headers defensivos', async () => {
    const app = express();
    app.use(headersSeguridad);
    app.get('/headers', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/headers');

    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers.pragma).toBe('no-cache');
  });

  it('validarContentType rechaza POST con body y content-type invalido', () => {
    const req = {
      method: 'POST',
      path: '/api/clientes',
      headers: {
        'content-length': '10',
        'content-type': 'text/plain',
      },
    } as any;

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json } as any;
    const next = jest.fn();

    validarContentType(req, res, next);

    expect(status).toHaveBeenCalledWith(415);
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('validarContentType permite metodos sin body', () => {
    const req = {
      method: 'GET',
      path: '/api/clientes',
      headers: {},
    } as any;

    const res = {} as any;
    const next = jest.fn();

    validarContentType(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('validarContentType permite rutas excluidas', () => {
    const req = {
      method: 'POST',
      path: '/api-docs',
      headers: {
        'content-length': '10',
        'content-type': 'text/plain',
      },
    } as any;

    const res = {} as any;
    const next = jest.fn();

    validarContentType(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('validarContentType permite application/json con charset', () => {
    const req = {
      method: 'POST',
      path: '/api/clientes',
      headers: {
        'content-length': '10',
        'content-type': 'application/json; charset=utf-8',
      },
    } as any;

    const res = {} as any;
    const next = jest.fn();

    validarContentType(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('validarContentType permite subtipos +json', () => {
    const req = {
      method: 'PATCH',
      path: '/api/clientes',
      headers: {
        'content-length': '10',
        'content-type': 'application/merge-patch+json',
      },
    } as any;

    const res = {} as any;
    const next = jest.fn();

    validarContentType(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('ocultarTecnologia remueve headers de fingerprinting', () => {
    const res = {
      removeHeader: jest.fn(),
    } as any;

    ocultarTecnologia({} as any, res, jest.fn());

    expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(res.removeHeader).toHaveBeenCalledWith('Server');
  });
});
