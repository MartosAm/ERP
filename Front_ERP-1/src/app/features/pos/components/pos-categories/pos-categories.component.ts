import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CategoriaArbol } from '../../../../core/models/api.model';

@Component({
  selector: 'app-pos-categories',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './pos-categories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosCategoriesComponent {
  categories = input.required<CategoriaArbol[]>();
  selectedCategory = input<string | null>(null);

  selectCategory = output<string | null>();

  onSelect(id: string | null) {
    this.selectCategory.emit(id);
  }
}
