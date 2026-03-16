import { describe, it, expect } from '@jest/globals';
import { sanitizarString, sanitizarObjeto } from './sanitizar';

describe('sanitizar utilidades', () => {
  it('sanitizarString hace trim y neutraliza html/js', () => {
    const result = sanitizarString('  <script>alert(1)</script> Hola  ');

    expect(result.startsWith(' ')).toBe(false);
    expect(result.endsWith(' ')).toBe(false);
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hola');
  });

  it('sanitizarObjeto limpia strings anidados y conserva tipos no string', () => {
    const fecha = new Date('2026-01-01T00:00:00.000Z');
    const input = {
      nombre: '  <b>Cliente</b>  ',
      activo: true,
      cantidad: 5,
      fecha,
      tags: ['  <img src=x onerror=1>  ', 'OK'],
      detalle: {
        comentario: ' <script>bad()</script> nota ',
      },
    };

    const output = sanitizarObjeto(input);

    expect(output.nombre).toBe('<b>Cliente</b>');
    expect(output.detalle.comentario).not.toContain('<script>');
    expect(output.tags[0]).not.toContain('onerror');
    expect(output.tags[1]).toBe('OK');
    expect(output.activo).toBe(true);
    expect(output.cantidad).toBe(5);
    expect(output.fecha).toBe(fecha);
  });
});
