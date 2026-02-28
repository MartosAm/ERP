import { Pipe, PipeTransform } from '@angular/core';
import { tiempoRelativo } from '../../core/utils/fecha.utils';

/**
 * Formatea ISO string como tiempo relativo.
 *
 * Uso: {{ '2026-02-28T14:00:00Z' | tiempoRelativo }}  →  "Hace 5 min"
 */
@Pipe({
  name: 'tiempoRelativo',
  standalone: true,
})
export class TiempoRelativoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return tiempoRelativo(valor);
  }
}
