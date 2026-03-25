import {
  finDiaISO,
  formatoFecha,
  formatoFechaHora,
  formatoHora,
  haceDiasISO,
  hoyISO,
  inicioMesISO,
  tiempoRelativo,
} from './fecha.utils';

describe('fecha.utils', () => {
  it('retorna guion para fecha invalida', () => {
    expect(formatoFecha('no-es-fecha')).toBe('—');
    expect(formatoFechaHora('')).toBe('—');
    expect(formatoHora(undefined)).toBe('—');
  });

  it('formatea fecha valida', () => {
    const out = formatoFecha('2026-03-24T10:15:00.000Z');
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('formatea hora valida', () => {
    const out = formatoHora('2026-03-24T10:15:00.000Z');
    expect(out).toMatch(/\d{2}:\d{2}/);
  });

  it('genera ISO utilitarios', () => {
    expect(() => new Date(hoyISO()).toISOString()).not.toThrow();
    expect(() => new Date(haceDiasISO(7)).toISOString()).not.toThrow();
    expect(() => new Date(inicioMesISO()).toISOString()).not.toThrow();
    expect(() => new Date(finDiaISO()).toISOString()).not.toThrow();
  });

  it('calcula tiempo relativo', () => {
    const haceDosHoras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(tiempoRelativo(haceDosHoras)).toContain('Hace');
  });
});
