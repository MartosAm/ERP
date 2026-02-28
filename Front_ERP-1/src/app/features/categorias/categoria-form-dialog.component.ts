import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CategoriasService } from '../../core/services/categorias.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Categoria, CategoriaArbol } from '../../core/models/api.model';

interface DialogData {
  modo: 'crear' | 'editar';
  categoria?: Categoria;
}

@Component({
  selector: 'app-categoria-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './categoria-form-dialog.component.html',
  styleUrl: './categoria-form-dialog.component.css',
})
export class CategoriaFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(CategoriasService);
  private readonly notify = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<CategoriaFormDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly categoriasPadre = signal<CategoriaArbol[]>([]);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    descripcion: [''],
    padreId: [''],
    colorHex: [''],
    nombreIcono: [''],
    orden: [0],
  });

  get esEdicion(): boolean {
    return this.data.modo === 'editar';
  }

  ngOnInit(): void {
    // Cargar categorías padre para el selector
    this.svc.obtenerArbol().subscribe((arbol) => this.categoriasPadre.set(arbol));

    if (this.esEdicion && this.data.categoria) {
      const c = this.data.categoria;
      this.form.patchValue({
        nombre: c.nombre,
        descripcion: c.descripcion ?? '',
        padreId: c.padreId ?? '',
        colorHex: c.colorHex ?? '',
        nombreIcono: c.nombreIcono ?? '',
        orden: c.orden,
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const raw = this.form.getRawValue();

    // Limpiar campos vacíos
    const payload: Record<string, unknown> = { nombre: raw.nombre };
    if (raw.descripcion) payload['descripcion'] = raw.descripcion;
    if (raw.padreId) payload['padreId'] = raw.padreId;
    if (raw.colorHex) payload['colorHex'] = raw.colorHex;
    if (raw.nombreIcono) payload['nombreIcono'] = raw.nombreIcono;
    if (raw.orden > 0) payload['orden'] = raw.orden;

    const obs$ = this.esEdicion
      ? this.svc.actualizar(this.data.categoria!.id, payload)
      : this.svc.crear(payload as { nombre: string });

    obs$.subscribe({
      next: () => {
        this.notify.exito(this.esEdicion ? 'Categoría actualizada' : 'Categoría creada');
        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.notify.error('Error al guardar categoría');
      },
    });
  }
}
