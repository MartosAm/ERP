import {
  AuthService,
  Router
} from "./chunk-QCMV2OHP.js";
import {
  MatCard,
  MatCardAvatar,
  MatCardContent,
  MatCardHeader,
  MatCardModule,
  MatCardSubtitle,
  MatCardTitle
} from "./chunk-MYVAYGHF.js";
import {
  takeUntilDestroyed
} from "./chunk-Q2EWMG7S.js";
import {
  NotificationService
} from "./chunk-KRZCM2EU.js";
import {
  MatError,
  MatFormField,
  MatFormFieldModule,
  MatInput,
  MatInputModule,
  MatLabel,
  MatSuffix
} from "./chunk-PRRJ5RHV.js";
import {
  DefaultValueAccessor,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  NgControlStatus,
  NgControlStatusGroup,
  ReactiveFormsModule,
  Validators,
  ɵNgNoValidate
} from "./chunk-BYYWSKOL.js";
import {
  MatProgressSpinner,
  MatProgressSpinnerModule
} from "./chunk-5FF4IDPG.js";
import {
  MatIcon,
  MatIconModule
} from "./chunk-AQUHBTXT.js";
import {
  MatButton,
  MatButtonModule,
  MatIconButton
} from "./chunk-QGQLHQW3.js";
import {
  CommonModule
} from "./chunk-JVWHMXC2.js";
import {
  DestroyRef,
  inject,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-PMZUQMU7.js";

// src/app/features/auth/login.component.ts
function LoginComponent_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "mat-error");
    \u0275\u0275text(1, "El correo es obligatorio");
    \u0275\u0275elementEnd();
  }
}
function LoginComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "mat-error");
    \u0275\u0275text(1, "Correo inv\xE1lido");
    \u0275\u0275elementEnd();
  }
}
function LoginComponent_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "mat-error");
    \u0275\u0275text(1, "La contrase\xF1a es obligatoria");
    \u0275\u0275elementEnd();
  }
}
function LoginComponent_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "mat-error");
    \u0275\u0275text(1, "M\xEDnimo 6 caracteres");
    \u0275\u0275elementEnd();
  }
}
function LoginComponent_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 9);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.errorLogin());
  }
}
function LoginComponent_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "mat-spinner", 11);
  }
}
function LoginComponent_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " Iniciar sesi\xF3n ");
  }
}
var LoginComponent = class _LoginComponent {
  constructor() {
    this.auth = inject(AuthService);
    this.router = inject(Router);
    this.notify = inject(NotificationService);
    this.fb = inject(FormBuilder);
    this.destroyRef = inject(DestroyRef);
    this.ocultarPass = signal(true);
    this.cargando = signal(false);
    this.errorLogin = signal(null);
    this.form = this.fb.nonNullable.group({
      correo: ["", [Validators.required, Validators.email]],
      contrasena: ["", [Validators.required, Validators.minLength(6)]]
    });
  }
  onLogin() {
    if (this.form.invalid)
      return;
    this.cargando.set(true);
    this.errorLogin.set(null);
    this.auth.login(this.form.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notify.exito("Bienvenido");
        this.router.navigate(["/dashboard"]);
      },
      error: (err) => {
        this.cargando.set(false);
        const mensaje = err?.error?.error?.mensaje || "Credenciales inv\xE1lidas";
        this.errorLogin.set(mensaje);
      }
    });
  }
  static {
    this.\u0275fac = function LoginComponent_Factory(t) {
      return new (t || _LoginComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoginComponent, selectors: [["app-login"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 32, vars: 10, consts: [[1, "login-wrapper"], [1, "login-card"], ["mat-card-avatar", "", 1, "text-indigo-500", "text-4xl"], [1, "flex", "flex-col", "gap-4", "mt-6", 3, "ngSubmit", "formGroup"], ["appearance", "outline"], ["matInput", "", "formControlName", "correo", "type", "email", "autocomplete", "email"], ["matSuffix", ""], ["matInput", "", "formControlName", "contrasena", "autocomplete", "current-password", 3, "type"], ["mat-icon-button", "", "matSuffix", "", "type", "button", "aria-label", "Mostrar u ocultar contrase\xF1a", 3, "click"], ["role", "alert", 1, "text-red-600", "text-sm", "text-center"], ["mat-raised-button", "", "color", "primary", "type", "submit", 1, "h-12", 3, "disabled"], ["diameter", "20"]], template: function LoginComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "mat-card", 1)(2, "mat-card-header")(3, "mat-icon", 2);
        \u0275\u0275text(4, "store");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "mat-card-title");
        \u0275\u0275text(6, "ERP POS");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(7, "mat-card-subtitle");
        \u0275\u0275text(8, "Inicia sesi\xF3n para continuar");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(9, "mat-card-content")(10, "form", 3);
        \u0275\u0275listener("ngSubmit", function LoginComponent_Template_form_ngSubmit_10_listener() {
          return ctx.onLogin();
        });
        \u0275\u0275elementStart(11, "mat-form-field", 4)(12, "mat-label");
        \u0275\u0275text(13, "Correo electr\xF3nico");
        \u0275\u0275elementEnd();
        \u0275\u0275element(14, "input", 5);
        \u0275\u0275elementStart(15, "mat-icon", 6);
        \u0275\u0275text(16, "mail");
        \u0275\u0275elementEnd();
        \u0275\u0275template(17, LoginComponent_Conditional_17_Template, 2, 0, "mat-error")(18, LoginComponent_Conditional_18_Template, 2, 0, "mat-error");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "mat-form-field", 4)(20, "mat-label");
        \u0275\u0275text(21, "Contrase\xF1a");
        \u0275\u0275elementEnd();
        \u0275\u0275element(22, "input", 7);
        \u0275\u0275elementStart(23, "button", 8);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_23_listener() {
          return ctx.ocultarPass.set(!ctx.ocultarPass());
        });
        \u0275\u0275elementStart(24, "mat-icon");
        \u0275\u0275text(25);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(26, LoginComponent_Conditional_26_Template, 2, 0, "mat-error")(27, LoginComponent_Conditional_27_Template, 2, 0, "mat-error");
        \u0275\u0275elementEnd();
        \u0275\u0275template(28, LoginComponent_Conditional_28_Template, 2, 1, "p", 9);
        \u0275\u0275elementStart(29, "button", 10);
        \u0275\u0275template(30, LoginComponent_Conditional_30_Template, 1, 0, "mat-spinner", 11)(31, LoginComponent_Conditional_31_Template, 1, 0);
        \u0275\u0275elementEnd()()()()();
      }
      if (rf & 2) {
        let tmp_1_0;
        let tmp_2_0;
        let tmp_5_0;
        let tmp_6_0;
        \u0275\u0275advance(10);
        \u0275\u0275property("formGroup", ctx.form);
        \u0275\u0275advance(7);
        \u0275\u0275conditional(17, ((tmp_1_0 = ctx.form.get("correo")) == null ? null : tmp_1_0.hasError("required")) && ((tmp_1_0 = ctx.form.get("correo")) == null ? null : tmp_1_0.touched) ? 17 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(18, ((tmp_2_0 = ctx.form.get("correo")) == null ? null : tmp_2_0.hasError("email")) && ((tmp_2_0 = ctx.form.get("correo")) == null ? null : tmp_2_0.touched) ? 18 : -1);
        \u0275\u0275advance(4);
        \u0275\u0275property("type", ctx.ocultarPass() ? "password" : "text");
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate(ctx.ocultarPass() ? "visibility_off" : "visibility");
        \u0275\u0275advance();
        \u0275\u0275conditional(26, ((tmp_5_0 = ctx.form.get("contrasena")) == null ? null : tmp_5_0.hasError("required")) && ((tmp_5_0 = ctx.form.get("contrasena")) == null ? null : tmp_5_0.touched) ? 26 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(27, ((tmp_6_0 = ctx.form.get("contrasena")) == null ? null : tmp_6_0.hasError("minlength")) && ((tmp_6_0 = ctx.form.get("contrasena")) == null ? null : tmp_6_0.touched) ? 27 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(28, ctx.errorLogin() ? 28 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("disabled", ctx.form.invalid || ctx.cargando());
        \u0275\u0275advance();
        \u0275\u0275conditional(30, ctx.cargando() ? 30 : 31);
      }
    }, dependencies: [
      CommonModule,
      ReactiveFormsModule,
      \u0275NgNoValidate,
      DefaultValueAccessor,
      NgControlStatus,
      NgControlStatusGroup,
      FormGroupDirective,
      FormControlName,
      MatCardModule,
      MatCard,
      MatCardAvatar,
      MatCardContent,
      MatCardHeader,
      MatCardSubtitle,
      MatCardTitle,
      MatFormFieldModule,
      MatFormField,
      MatLabel,
      MatError,
      MatSuffix,
      MatInputModule,
      MatInput,
      MatButtonModule,
      MatButton,
      MatIconButton,
      MatIconModule,
      MatIcon,
      MatProgressSpinnerModule,
      MatProgressSpinner
    ], styles: ["\n\n.login-wrapper[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n}\n.login-card[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 420px;\n  padding: 32px;\n  border-radius: 12px;\n}\n/*# sourceMappingURL=login.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoginComponent, { className: "LoginComponent", filePath: "src/app/features/auth/login.component.ts", lineNumber: 31 });
})();
export {
  LoginComponent
};
//# sourceMappingURL=chunk-SW7QFXMT.js.map
