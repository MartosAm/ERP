import { describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { limitarLogin } from './limitarRates';

describe('limitarRates', () => {
  it('aplica 429 despues de exceder intentos en login', async () => {
    const app = express();
    app.use(express.json());

    app.post('/auth/login', limitarLogin, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '198.51.100.10')
        .send({ correo: 'demo@erp.com', contrasena: 'x' });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-For', '198.51.100.10')
      .send({ correo: 'demo@erp.com', contrasena: 'x' });

    expect(blocked.status).toBe(429);
    expect(blocked.body?.error?.codigo).toBe('RATE_LIMIT');
  });
});
