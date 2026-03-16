/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import { sanitizarBody } from './sanitizarBody';

describe('middleware sanitizarBody', () => {
  it('sanitiza strings en req.body de forma recursiva', () => {
    const req = {
      body: {
        nombre: '  <script>alert(1)</script> Juan  ',
        notas: ['  <b>hola</b>  ', 'normal'],
        meta: {
          comentario: ' <img src=x onerror=alert(1)> ',
        },
      },
    } as any;

    const next = jest.fn();

    sanitizarBody(req, {} as any, next);

    expect(req.body.nombre).not.toContain('<script>');
    expect(req.body.nombre).toContain('Juan');
    expect(req.body.meta.comentario).not.toContain('onerror');
    expect(next).toHaveBeenCalledWith();
  });

  it('no modifica cuando body no es objeto', () => {
    const req = { body: undefined } as any;
    const next = jest.fn();

    sanitizarBody(req, {} as any, next);

    expect(req.body).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});
