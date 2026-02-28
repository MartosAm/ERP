import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import type { Rol } from '../../core/models/api.model';

/**
 * Directiva estructural para mostrar/ocultar elementos según el rol del usuario.
 *
 * Uso:
 *   <button *appRol="'ADMIN'">Solo Admin</button>
 *   <section *appRol="['ADMIN', 'CAJERO']">Admin o Cajero</section>
 */
@Directive({
  selector: '[appRol]',
  standalone: true,
})
export class RolDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private rolesPermitidos: Rol[] = [];
  private mostrado = false;

  @Input()
  set appRol(roles: Rol | Rol[]) {
    this.rolesPermitidos = Array.isArray(roles) ? roles : [roles];
    this.actualizar();
  }

  constructor() {
    // Reaccionar a cambios en el usuario (login/logout)
    // effect() en constructor tiene injection context automático
    effect(() => {
      this.auth.usuario();
      this.actualizar();
    });
  }

  private actualizar(): void {
    const usuario = this.auth.usuario();
    const tieneRol =
      !!usuario && this.rolesPermitidos.includes(usuario.rol);

    if (tieneRol && !this.mostrado) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.mostrado = true;
    } else if (!tieneRol && this.mostrado) {
      this.viewContainer.clear();
      this.mostrado = false;
    }
  }
}
