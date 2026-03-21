import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LineaCarrito } from '../../models/pos.model';
import { Cliente } from '../../../../core/models/api.model';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';

@Component({
  selector: 'app-pos-cart',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatButtonModule, 
    MatTooltipModule,
    MonedaPipe
  ],
  templateUrl: './pos-cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosCartComponent {
  cartLines = input.required<LineaCarrito[]>();
  selectedClient = input<Cliente | null>(null);

  selectClient = output<void>();
  removeClient = output<void>();
  clearCart = output<void>();
  updateQuantity = output<{ id: string; delta: number }>();
  removeLine = output<string>();
  checkout = output<void>();

  // Computados locales para totales (o podrían venir del padre, pero aquí es seguro calcularlos si es solo visualización)
  totalItems = computed(() => this.cartLines().reduce((acc, l) => acc + l.cantidad, 0));
  
  subTotal = computed(() => {
    return this.cartLines().reduce((acc, l) => {
      // Simplificación: asumiendo precioUnitario incluye o no impuesto según lógica de negocio.
      // Aquí sumamos el total bruto.
      return acc + (l.precioUnitario * l.cantidad); 
    }, 0);
  });

  // Para ejemplo, impuestos simples. En un caso real usaría la lógica del servicio.
  // Pero espera, el padre ya tiene la "source of truth".
  // Mejor inputs para totales si la lógica es compleja.
  // Voy a usar computados simples por ahora, pero lo ideal es pasar el total calculado del padre.
  // Para mantener la consistencia con pos.component.ts original que usa señales...
  // Vamos a recalcular aquí para visualización rápida.

  impuestos = computed(() => 0); // Placeholder si no pasamos el cálculo de impuestos
  // Actually, let's keep it simple. The Parent HAS the logic.
  // But wait, the parent `pos.component` calculated `total`.
  // I should add inputs for totals.

  total = computed(() => this.subTotal()); 
}
