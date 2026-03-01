import {
  Component,
  inject,
  OnInit,
  signal,
  DestroyRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ReportesService } from '../../core/services/reportes.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';

import { Chart, registerables } from 'chart.js';

import type {
  VentasResumen,
  TopProductosReporte,
  MetodosPagoReporte,
  InventarioValorizadoReporte,
  CajerosReporte,
  EntregasReporte,
  FiltroFechas,
} from '../../core/models/api.model';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    PageHeaderComponent,
    MonedaPipe,
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
})
export class ReportesComponent implements OnInit, OnDestroy {
  private readonly svc = inject(ReportesService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Filtro de fechas ──────────────────────────────────────
  readonly rangoForm = this.fb.nonNullable.group({
    fechaDesde: [this.hace30Dias()],
    fechaHasta: [new Date()],
  });

  // ─── Data signals ──────────────────────────────────────────
  readonly ventas = signal<VentasResumen | null>(null);
  readonly topProductos = signal<TopProductosReporte | null>(null);
  readonly metodosPago = signal<MetodosPagoReporte | null>(null);
  readonly inventario = signal<InventarioValorizadoReporte | null>(null);
  readonly cajeros = signal<CajerosReporte | null>(null);
  readonly entregas = signal<EntregasReporte | null>(null);
  readonly cargando = signal(false);

  // ─── Charts ────────────────────────────────────────────────
  private chartVentas: Chart | null = null;
  private chartMetodos: Chart | null = null;
  private chartCajeros: Chart | null = null;
  private chartEntregas: Chart | null = null;

  tabActiva = 0;

  ngOnInit(): void {
    this.cargarTodo();
  }

  ngOnDestroy(): void {
    this.chartVentas?.destroy();
    this.chartMetodos?.destroy();
    this.chartCajeros?.destroy();
    this.chartEntregas?.destroy();
  }

  private getFiltro(): FiltroFechas {
    const raw = this.rangoForm.getRawValue();
    return {
      fechaDesde: this.formatDate(raw.fechaDesde),
      fechaHasta: this.formatDate(raw.fechaHasta),
    };
  }

  cargarTodo(): void {
    this.cargando.set(true);
    const filtro = this.getFiltro();

    this.svc
      .ventas(filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.ventas.set(d);
          this.cargando.set(false);
          setTimeout(() => this.renderChartVentas(d), 100);
        },
        error: () => this.cargando.set(false),
      });

    this.svc
      .topProductos({ ...filtro, limite: 10 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => this.topProductos.set(d));

    this.svc
      .metodosPago(filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        this.metodosPago.set(d);
        setTimeout(() => this.renderChartMetodos(d), 100);
      });

    this.svc
      .inventario()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => this.inventario.set(d));

    this.svc
      .cajeros(filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        this.cajeros.set(d);
        setTimeout(() => this.renderChartCajeros(d), 100);
      });

    this.svc
      .entregas(filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        this.entregas.set(d);
        setTimeout(() => this.renderChartEntregas(d), 100);
      });
  }

  aplicarFiltro(): void {
    this.cargarTodo();
  }

  onTabChange(idx: number): void {
    this.tabActiva = idx;
    // Re-render charts when switching tabs
    setTimeout(() => {
      if (idx === 0 && this.ventas()) this.renderChartVentas(this.ventas()!);
      if (idx === 2 && this.metodosPago()) this.renderChartMetodos(this.metodosPago()!);
      if (idx === 4 && this.cajeros()) this.renderChartCajeros(this.cajeros()!);
      if (idx === 5 && this.entregas()) this.renderChartEntregas(this.entregas()!);
    }, 150);
  }

  // ─── Charts rendering ─────────────────────────────────────
  private renderChartVentas(data: VentasResumen): void {
    this.chartVentas?.destroy();
    const canvas = document.getElementById('chartVentas') as HTMLCanvasElement;
    if (!canvas) return;
    this.chartVentas = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.ventasPorDia.map((d) => d.fecha.slice(5)),
        datasets: [
          {
            label: 'Ventas por día',
            data: data.ventasPorDia.map((d) => d.total),
            backgroundColor: 'rgba(63, 81, 181, 0.6)',
            borderColor: '#3f51b5',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => '$' + Number(v).toLocaleString() } },
        },
      },
    });
  }

  private renderChartMetodos(data: MetodosPagoReporte): void {
    this.chartMetodos?.destroy();
    const canvas = document.getElementById('chartMetodos') as HTMLCanvasElement;
    if (!canvas) return;
    const colores = ['#3f51b5', '#ff4081', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
    this.chartMetodos = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.desglose.map((d) => this.metodoLabel(d.metodo)),
        datasets: [
          {
            data: data.desglose.map((d) => d.total),
            backgroundColor: colores.slice(0, data.desglose.length),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } },
      },
    });
  }

  private renderChartCajeros(data: CajerosReporte): void {
    this.chartCajeros?.destroy();
    const canvas = document.getElementById('chartCajeros') as HTMLCanvasElement;
    if (!canvas) return;
    this.chartCajeros = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.cajeros.map((c) => c.nombre),
        datasets: [
          {
            label: 'Total vendido',
            data: data.cajeros.map((c) => c.totalVendido),
            backgroundColor: 'rgba(63, 81, 181, 0.6)',
          },
          {
            label: 'Cancelaciones',
            data: data.cajeros.map((c) => c.cancelaciones),
            backgroundColor: 'rgba(244, 67, 54, 0.6)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private renderChartEntregas(data: EntregasReporte): void {
    this.chartEntregas?.destroy();
    const canvas = document.getElementById('chartEntregas') as HTMLCanvasElement;
    if (!canvas) return;
    const colores = ['#4caf50', '#f44336', '#ff9800', '#2196f3', '#9c27b0', '#607d8b'];
    this.chartEntregas = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: data.porEstado.map((e) => e.estado),
        datasets: [
          {
            data: data.porEstado.map((e) => e.cantidad),
            backgroundColor: colores.slice(0, data.porEstado.length),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } },
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────
  metodoLabel(metodo: string): string {
    const map: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      TARJETA_DEBITO: 'T. Débito',
      TARJETA_CREDITO: 'T. Crédito',
      TRANSFERENCIA: 'Transferencia',
      CREDITO_CLIENTE: 'Crédito',
    };
    return map[metodo] || metodo;
  }

  private hace30Dias(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
