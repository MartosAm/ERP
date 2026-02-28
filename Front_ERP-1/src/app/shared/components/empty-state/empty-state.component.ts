import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  @Input() icono = 'inbox';
  @Input() mensaje = 'No se encontraron resultados';
  @Input() submensaje = '';
  @Input() textoAccion = '';
  @Output() accion = new EventEmitter<void>();
}
