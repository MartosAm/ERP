import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import type { OrdenCreada } from '../../core/models/api.model';

interface TicketData {
  orden: OrdenCreada;
}

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA_DEBITO: 'T. Débito',
  TARJETA_CREDITO: 'T. Crédito',
  TRANSFERENCIA: 'Transferencia',
  CREDITO_CLIENTE: 'Crédito',
};

@Component({
  selector: 'app-ticket-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatDividerModule, MonedaPipe, DatePipe,
  ],
  templateUrl: './ticket-dialog.component.html',
  styleUrl: './ticket-dialog.component.css',
})
export class TicketDialogComponent {
  readonly dialogRef = inject(MatDialogRef<TicketDialogComponent>);
  readonly data: TicketData = inject(MAT_DIALOG_DATA);

  get orden(): OrdenCreada {
    return this.data.orden;
  }

  metodoLabel(metodo: string): string {
    return METODO_LABELS[metodo] || metodo;
  }

  nuevaVenta(): void {
    this.dialogRef.close();
  }
}
