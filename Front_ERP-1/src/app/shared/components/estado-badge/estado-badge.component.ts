import { Component, Input } from '@angular/core';

type TipoBadge = 'orden' | 'entrega' | 'activo' | 'movimiento' | 'compra' | 'turno' | 'pago';

interface BadgeConfig {
  bg: string;
  text: string;
  label: string;
}

const ESTADOS_ORDEN: Record<string, BadgeConfig> = {
  COTIZACION:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Cotización' },
  PENDIENTE:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
  EN_PROCESO:  { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En proceso' },
  COMPLETADA:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completada' },
  CANCELADA:   { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelada' },
  DEVUELTA:    { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Devuelta' },
};

const ESTADOS_ENTREGA: Record<string, BadgeConfig> = {
  ASIGNADO:      { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Asignado' },
  EN_RUTA:       { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En ruta' },
  ENTREGADO:     { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Entregado' },
  NO_ENTREGADO:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'No entregado' },
  REPROGRAMADO:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Reprogramado' },
};

const ESTADOS_ACTIVO: Record<string, BadgeConfig> = {
  true:  { bg: 'bg-green-100', text: 'text-green-800', label: 'Activo' },
  false: { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'Inactivo' },
};

const ESTADOS_MOVIMIENTO: Record<string, BadgeConfig> = {
  ENTRADA:       { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Entrada' },
  SALIDA_VENTA:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Salida venta' },
  AJUSTE_MANUAL: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ajuste manual' },
  DEVOLUCION:    { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Devolución' },
  MERMA:         { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Merma' },
  TRASLADO:      { bg: 'bg-cyan-100',   text: 'text-cyan-800',   label: 'Traslado' },
};

const ESTADOS_COMPRA: Record<string, BadgeConfig> = {
  true:  { bg: 'bg-green-100', text: 'text-green-800', label: 'Recibida' },
  false: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
};

const ESTADOS_TURNO: Record<string, BadgeConfig> = {
  true:  { bg: 'bg-green-100', text: 'text-green-800', label: 'Abierto' },
  false: { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'Cerrado' },
};

const ESTADOS_PAGO: Record<string, BadgeConfig> = {
  EFECTIVO:          { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Efectivo' },
  TARJETA_DEBITO:    { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Débito' },
  TARJETA_CREDITO:   { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Crédito' },
  TRANSFERENCIA:     { bg: 'bg-cyan-100',   text: 'text-cyan-800',   label: 'Transferencia' },
  CREDITO_CLIENTE:   { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Crédito cliente' },
  MIXTO:             { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Mixto' },
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
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  label: '—',
};

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  templateUrl: './estado-badge.component.html',
  styleUrl: './estado-badge.component.css',
})
export class EstadoBadgeComponent {
  @Input({ required: true }) estado: string | boolean = '';
  @Input() tipo: TipoBadge = 'orden';

  get config(): BadgeConfig {
    const mapa = MAPA_TIPOS[this.tipo];
    if (!mapa) return DEFAULT_CONFIG;
    const key = String(this.estado);
    return mapa[key] ?? { ...DEFAULT_CONFIG, label: key };
  }
}
