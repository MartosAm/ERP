import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-cancelar-orden-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
  ],
  templateUrl: './cancelar-orden-dialog.component.html',
})
export class CancelarOrdenDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<CancelarOrdenDialogComponent>);

  readonly form = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.minLength(5)]],
  });

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue().motivo);
  }
}
