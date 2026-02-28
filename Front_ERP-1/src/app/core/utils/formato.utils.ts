/**
 * core/utils/formato.utils.ts
 * ------------------------------------------------------------------
 * Helpers para formato de moneda, números y porcentajes.
 * ------------------------------------------------------------------
 */

const FMT_MONEDA = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FMT_NUMERO = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const FMT_PORCENTAJE = new Intl.NumberFormat('es-MX', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Formatea número como moneda MXN: "$1,234.56" */
export function formatoMoneda(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return '$0.00';
  return FMT_MONEDA.format(valor);
}

/** Formatea número con separadores de miles: "1,234.5" */
export function formatoNumero(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return '0';
  return FMT_NUMERO.format(valor);
}

/** Formatea fracción como porcentaje: "12.5%" */
export function formatoPorcentaje(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return '0.0%';
  return FMT_PORCENTAJE.format(valor / 100);
}

/** Trunca texto largo con "..." */
export function truncar(texto: string | null | undefined, max: number): string {
  if (!texto) return '';
  return texto.length > max ? texto.slice(0, max) + '…' : texto;
}

/** Capitaliza primera letra */
export function capitalizar(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/** Convierte enum tipo "TARJETA_CREDITO" a "Tarjeta crédito" */
export function formatoEnum(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor
    .split('_')
    .map((p, i) => (i === 0 ? capitalizar(p) : p.toLowerCase()))
    .join(' ');
}
