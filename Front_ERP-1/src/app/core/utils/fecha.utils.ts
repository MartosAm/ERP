/**
 * core/utils/fecha.utils.ts
 * ------------------------------------------------------------------
 * Helpers para manejo de fechas ISO (strings que vienen del backend).
 * ------------------------------------------------------------------
 */

/** Formatea ISO string a "dd/MM/yyyy" */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formatea ISO string a "dd/MM/yyyy HH:mm" */
export function formatoFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formatea ISO string a "HH:mm" */
export function formatoHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Genera ISO string de hoy a las 00:00 local */
export function hoyISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Genera ISO string de hace N días a las 00:00 local */
export function haceDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Genera ISO del primer día del mes actual */
export function inicioMesISO(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Genera ISO del último instante del día actual */
export function finDiaISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Calcula "hace X minutos/horas/días" relativo */
export function tiempoRelativo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  const ahora = Date.now();
  const diff = ahora - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const horas = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 30) return `Hace ${dias}d`;
  return formatoFecha(iso);
}
