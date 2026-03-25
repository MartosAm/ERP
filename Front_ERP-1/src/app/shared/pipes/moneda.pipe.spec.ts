import { MonedaPipe } from './moneda.pipe';

describe('MonedaPipe', () => {
  it('formatea valores numericos a moneda', () => {
    const pipe = new MonedaPipe();
    const out = pipe.transform(1200);

    expect(out).toContain('$');
    expect(out).toContain('1,200');
  });

  it('retorna 0 para null o undefined', () => {
    const pipe = new MonedaPipe();

    expect(pipe.transform(null)).toBe('$0.00');
    expect(pipe.transform(undefined)).toBe('$0.00');
  });
});
