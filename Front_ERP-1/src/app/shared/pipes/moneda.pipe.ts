import { Pipe, PipeTransform } from '@angular/core';
import { formatoMoneda } from '../../core/utils/formato.utils';

/**
 * Pipe para formatear valores numéricos como moneda MXN.
 *
 * Uso: {{ 1234.5 | moneda }}  →  "$1,234.50"
 */
@Pipe({
  name: 'moneda',
  standalone: true,
})
export class MonedaPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatoMoneda(valor);
  }
}
