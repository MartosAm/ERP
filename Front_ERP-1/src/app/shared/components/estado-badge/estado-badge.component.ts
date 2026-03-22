import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TipoBadge = 'orden' | 'entrega' | 'activo' | 'movimiento' | 'compra' | 'turno' | 'pago';

interface BadgeConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
}

const ESTADOS_ORDEN: Record<string, BadgeConfig> = {
  COTIZACION:  { bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-700 dark:text-indigo-400',   border: 'border-indigo-200 dark:border-indigo-500/20', dot: 'bg-indigo-500', label: 'Cotización' },
  PENDIENTE:   { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500', label: 'Pendiente' },
  EN_PROCESO:  { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20', dot: 'bg-orange-500', label: 'En proceso' },
  COMPLETADA:  { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-700 dark:text-emerald-400',  border: 'border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500', label: 'Completada' },
  CANCELADA:   { bg: 'bg-rose-50 dark:bg-rose-500/10',    text: 'text-rose-700 dark:text-rose-400',    border: 'border-rose-200 dark:border-rose-500/20', dot: 'bg-rose-500', label: 'Cancelada' },
  DEVUELTA:    { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500', label: 'Devuelta' },
};

const ESTADOS_ENTREGA: Record<string, BadgeConfig> = {
  ASIGNADO:      { bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 flex border border-indigo-500/20', dot: 'bg-indigo-500', label: 'Asignado' },
  EN_RUTA:       { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 border border-cyan-500/20', dot: 'bg-cyan-500', label: 'En ruta' },
  ENTREGADO:     { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-700 dark:text-emerald-400',  border: 'border-emerald-200 border border-emerald-500/20', dot: 'bg-emerald-500', label: 'Entregado' },
  NO_ENTREGADO:  { bg: 'bg-rose-50 dark:bg-rose-500/10',    text: 'text-rose-700 dark:text-rose-400',    border: 'border-rose-200 border border-rose-500/20', dot: 'bg-rose-500', label: 'No entregado' },
  REPROGRAMADO:  { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 border border-amber-500/20', dot: 'bg-amber-500', label: 'Reprogramado' },
};

const ESTADOS_ACTIVO: Record<string, BadgeConfig> = {
  true:  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 border', dot: 'bg-emerald-500', label: 'Activo' },
  false: { bg: 'bg-slate-50 dark:bg-slate-500/10',  text: 'text-slate-600 dark:text-slate-400',  border: 'border-slate-200 border', dot: 'bg-slate-400', label: 'Inactivo' },
};

const ESTADOS_MOVIMIENTO: Record<string, BadgeConfig> = {
  ENTRADA:       { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 border', dot: 'bg-emerald-500', label: 'Entrada' },
  SALIDA_VENTA:  { bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 border', dot: 'bg-indigo-500', label: 'Salida venta' },
  AJUSTE_MANUAL: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 border', dot: 'bg-amber-500', label: 'Ajuste manual' },
  DEVOLUCION:    { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 border', dot: 'bg-violet-500', label: 'Devolución' },
  MERMA:         { bg: 'bg-rose-50 dark:bg-rose-500/10',    text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 border', dot: 'bg-rose-500', label: 'Merma' },
  TRASLADO:      { bg: 'bg-teal-50 dark:bg-teal-500/10',   text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 border', dot: 'bg-teal-500', label: 'Traslado' },
};

const ESTADOS_COMPRA: Record<string, BadgeConfig> = {
  true:  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 border', dot: 'bg-emerald-500', label: 'Recibida' },
  false: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 border', dot: 'bg-amber-500', label: 'Pendiente' },
};

const ESTADOS_TURNO: Record<string, BadgeConfig> = {
  true:  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 border', dot: 'bg-emerald-500', label: 'Abierto' },
  false: { bg: 'bg-slate-50 dark:bg-slate-500/10',  text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 border', dot: 'bg-slate-400', label: 'Cerrado' },
};

const ESTADOS_PAGO: Record<string, BadgeConfig> = {
  EFECTIVO:          { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 border', dot: 'bg-emerald-500', label: 'Efectivo' },
  TARJETA_DEBITO:    { bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 border', dot: 'bg-indigo-500', label: 'Débito' },
  TARJETA_CREDITO:   { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 border', dot: 'bg-violet-500', label: 'Crédito' },
  TRANSFERENCIA:     { bg: 'bg-teal-50 dark:bg-teal-500/10',   text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 border', dot: 'bg-teal-500', label: 'Transferencia' },
  CREDITO_CLIENTE:   { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 border', dot: 'bg-orange-500', label: 'Crédito cliente' },
  MIXTO:             { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 border', dot: 'bg-amber-500', label: 'Mixto' },
};

const MAPA_TIPOS: Record<TipoBadge, Record<string, BadgeConfig>> = {
  orden: ESTADOS_ORDEN,
  entrega: ESTADOS_ENTREGA,
  activo: ESTADOS_ACTIVO,
  movimiento: ESTADOS_MOVIMIENTO,
  compra: ESTADOS_COMPRA,
  turno: ESTADOS_TURNO,
  pago: ESTADOS_PAGO,
};

const DEFAULT_CONFIG: BadgeConfig = {
  bg: 'bg-slate-50 dark:bg-slate-800/50',
  text: 'text-slate-600 dark:text-slate-400',
  border: 'border-slate-200 dark:border-slate-700 border',
  dot: 'bg-slate-400',
  label: '—',
};

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border shadow-sm w-fit"
      [ngClass]="[config.bg, config.text, config.border]">
      
      <!-- Optional Dot indicator for better modern look -->
      <span class="w-1.5 h-1.5 rounded-full mr-1.5" [ngClass]="config.dot"></span>
      <span class="truncate">{{ config.label }}</span>
    </span>
  `
})
export class EstadoBadgeComponent {
  @Input({ required: true }) estado: string | boolean | undefined | null = '';
  @Input() tipo: TipoBadge = 'orden';

  get config(): BadgeConfig {
    const mapa = MAPA_TIPOS[this.tipo];
    if (!mapa) return DEFAULT_CONFIG;
    // Si estado es null/undefined, lo volvemos string
    const key = String(this.estado);
    return mapa[key] ?? { ...DEFAULT_CONFIG, label: key };
  }
}
