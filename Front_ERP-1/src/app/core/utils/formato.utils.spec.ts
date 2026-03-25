import {
  capitalizar,
  formatoEnum,
  formatoMoneda,
  formatoNumero,
  formatoPorcentaje,
  truncar,
} from './formato.utils';

describe('formato.utils', () => {
  it('formatea moneda en MXN', () => {
    const out = formatoMoneda(1234.5);
    expect(out).toContain('$');
    expect(out).toContain('1,234');
  });

  it('maneja null/undefined en moneda', () => {
    expect(formatoMoneda(null)).toBe('$0.00');
    expect(formatoMoneda(undefined)).toBe('$0.00');
  });

  it('formatea numeros con separador de miles', () => {
    const out = formatoNumero(10500.25);
    expect(out).toContain('10,500');
  });

  it('formatea porcentaje', () => {
    expect(formatoPorcentaje(16)).toContain('%');
  });

  it('trunca texto largo', () => {
    expect(truncar('abcdef', 4)).toBe('abcd…');
    expect(truncar('abc', 4)).toBe('abc');
  });

  it('capitaliza textos', () => {
    expect(capitalizar('hOLA')).toBe('Hola');
    expect(capitalizar('')).toBe('');
  });

  it('formatea enums UPPER_SNAKE', () => {
    expect(formatoEnum('TARJETA_CREDITO')).toBe('Tarjeta credito');
  });
});
