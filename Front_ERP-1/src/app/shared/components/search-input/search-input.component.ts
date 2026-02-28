import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  DestroyRef,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.css',
})
export class SearchInputComponent implements OnInit {
  @Input() placeholder = 'Buscar...';
  @Input() debounce = 300;
  @Output() buscar = new EventEmitter<string>();

  private readonly destroyRef = inject(DestroyRef);
  readonly control = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.control.valueChanges
      .pipe(
        debounceTime(this.debounce),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((valor) => this.buscar.emit(valor.trim()));
  }

  limpiar(): void {
    this.control.setValue('');
    this.buscar.emit('');
  }
}
