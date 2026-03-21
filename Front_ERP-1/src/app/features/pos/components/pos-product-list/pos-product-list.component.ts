import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductoPOS } from '../../../../core/models/api.model';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';

@Component({
  selector: 'app-pos-product-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MonedaPipe
  ],
  templateUrl: './pos-product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosProductListComponent {
  products = input.required<ProductoPOS[]>();
  loading = input<boolean>(false);

  addProduct = output<ProductoPOS>();

  onAdd(product: ProductoPOS) {
    this.addProduct.emit(product);
  }
}
