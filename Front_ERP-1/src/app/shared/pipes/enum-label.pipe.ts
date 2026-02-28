import { Pipe, PipeTransform } from '@angular/core';
import { formatoEnum } from '../../core/utils/formato.utils';

/**
 * Convierte valores enum como "TARJETA_CREDITO" a "Tarjeta crédito".
 *
 * Uso: {{ 'TARJETA_CREDITO' | enumLabel }}  →  "Tarjeta crédito"
 */
@Pipe({
  name: 'enumLabel',
  standalone: true,
})
export class EnumLabelPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatoEnum(valor);
  }
}
