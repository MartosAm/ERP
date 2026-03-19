import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

import { ClientesService } from '../../core/services/clientes.service';
import type { Cliente } from '../../core/models/api.model';

@Component({
    selector: 'app-cliente-dialog',
    imports: [
        CommonModule, FormsModule, MatDialogModule,
        MatFormFieldModule, MatInputModule, MatButtonModule,
        MatIconModule, MatListModule, MatProgressSpinnerModule,
    ],
    templateUrl: './cliente-dialog.component.html',
    styleUrl: './cliente-dialog.component.css'
})
export class ClienteDialogComponent {
  private readonly clientesSvc = inject(ClientesService);
  private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<ClienteDialogComponent>);

  readonly clientes = signal<Cliente[]>([]);
  readonly cargando = signal(false);
  readonly busqueda$ = new Subject<string>();
  termino = '';

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term.trim()) {
            this.clientes.set([]);
            return of(null);
          }
          this.cargando.set(true);
          return this.clientesSvc.listar({ buscar: term, limite: 15 }).pipe(
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.cargando.set(false);
        if (res) this.clientes.set(res.datos);
      });
  }

  onBuscar(term: string): void {
    this.busqueda$.next(term);
  }

  seleccionar(cliente: Cliente): void {
    this.dialogRef.close(cliente);
  }
}
