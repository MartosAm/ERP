import { Component, input, output, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-pos-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './pos-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosToolbarComponent {
  terminoBusqueda = input<string>('');
  listaPrecio = input<number>(1);

  searchChange = output<string>();
  searchSubmit = output<string>(); // Para el "Enter"
  priceChange = output<number>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  onSearchChange(val: string) {
    this.searchChange.emit(val);
  }

  onEnter() {
    this.searchSubmit.emit(this.terminoBusqueda());
  }

  onClear() {
    this.searchChange.emit('');
    // Dar foco de nuevo input tras limpiar es buena UX
    setTimeout(() => this.searchInput.nativeElement.focus(), 0);
  }

  onPriceChange(priceList: number) {
    this.priceChange.emit(priceList);
  }
}
