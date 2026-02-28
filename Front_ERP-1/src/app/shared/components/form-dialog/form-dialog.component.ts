import { Component, Input } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './form-dialog.component.html',
  styleUrl: './form-dialog.component.css',
})
export class FormDialogComponent {
  @Input({ required: true }) titulo = '';
  @Input() icono = '';
  @Input() cargando = false;
}
