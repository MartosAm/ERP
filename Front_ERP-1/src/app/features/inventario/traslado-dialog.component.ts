import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventarioService } from '../../core/services/inventario.service';
import { ProductosService } from '../../core/services/productos.service';
import { AlmacenesService } from '../../core/services/almacenes.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Producto, Almacen } from '../../core/models/api.model';

@Component({
  selector: 'app-traslado-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './traslado-dialog.component.html',
})
export class TrasladoDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(InventarioService);
  private readonly productosSvc = inject(ProductosService);
  private readonly almacenesSvc = inject(AlmacenesService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<TrasladoDialogComponent>);

  readonly guardando = signal(false);
  readonly productos = signal<Producto[]>([]);
  readonly almacenes = signal<Almacen[]>([]);

  readonly form = this.fb.nonNullable.group({
    productoId: ['', Validators.required],
    almacenOrigenId: ['', Validators.required],
    almacenDestinoId: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    motivo: [''],
  });

  ngOnInit(): void {
    this.productosSvc.listar({ limite: 200, activo: true })
      .subscribe((res) => this.productos.set(res.datos));
    this.almacenesSvc.listar({ limite: 100, activo: true })
      .subscribe((res) => this.almacenes.set(res.datos));
  }

  get almacenesDestino(): Almacen[] {
    const origenId = this.form.get('almacenOrigenId')?.value;
    return this.almacenes().filter((a) => a.id !== origenId);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.almacenOrigenId === raw.almacenDestinoId) {
      this.notify.error('El almacén origen y destino deben ser diferentes');
      return;
    }

    this.guardando.set(true);

    this.svc.trasladar({
      productoId: raw.productoId,
      almacenOrigenId: raw.almacenOrigenId,
      almacenDestinoId: raw.almacenDestinoId,
      cantidad: raw.cantidad,
      motivo: raw.motivo || undefined,
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al registrar el traslado');
      },
    });
  }
}
