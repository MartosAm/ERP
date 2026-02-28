import { Pipe, PipeTransform } from '@angular/core';
import { formatoFecha, formatoFechaHora } from '../../core/utils/fecha.utils';

/**
 * Formatea ISO string a "dd/MM/yyyy".
 *
 * Uso: {{ '2026-02-28T...' | fechaCorta }}  →  "28/02/2026"
 */
@Pipe({
  name: 'fechaCorta',
  standalone: true,
})
export class FechaCortaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatoFecha(valor);
  }
}

/**
 * Formatea ISO string a "dd/MM/yyyy HH:mm".
 *
 * Uso: {{ '2026-02-28T14:30:00Z' | fechaHora }}  →  "28/02/2026 14:30"
 */
@Pipe({
  name: 'fechaHora',
  standalone: true,
})
export class FechaHoraPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatoFechaHora(valor);
  }
}
