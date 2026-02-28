import {
  MatCardModule
} from "./chunk-MYVAYGHF.js";
import {
  MatDividerModule
} from "./chunk-SLIT2EDN.js";
import {
  takeUntilDestroyed
} from "./chunk-Q2EWMG7S.js";
import {
  NotificationService
} from "./chunk-KRZCM2EU.js";
import {
  MatProgressSpinner,
  MatProgressSpinnerModule
} from "./chunk-5FF4IDPG.js";
import {
  MatIcon,
  MatIconModule
} from "./chunk-AQUHBTXT.js";
import {
  ApiService,
  MatButtonModule,
  MatIconButton
} from "./chunk-QGQLHQW3.js";
import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  DecimalPipe
} from "./chunk-JVWHMXC2.js";
import {
  DestroyRef,
  inject,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind2,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-PMZUQMU7.js";

// src/app/core/services/dashboard.service.ts
var DashboardService = class _DashboardService {
  constructor() {
    this.api = inject(ApiService);
  }
  obtenerKPIs() {
    return this.api.get("reportes/dashboard");
  }
  static {
    this.\u0275fac = function DashboardService_Factory(t) {
      return new (t || _DashboardService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _DashboardService, factory: _DashboardService.\u0275fac, providedIn: "root" });
  }
};

// src/app/features/dashboard/dashboard.component.ts
function DashboardComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275element(1, "mat-spinner", 5);
    \u0275\u0275elementEnd();
  }
}
function DashboardComponent_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 6)(1, "div", 7)(2, "span", 8);
    \u0275\u0275text(3, "Ventas hoy");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 9);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "currency");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 10);
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "currency");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 7)(11, "span", 8);
    \u0275\u0275text(12, "Ventas del mes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span", 9);
    \u0275\u0275text(14);
    \u0275\u0275pipe(15, "currency");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 11);
    \u0275\u0275text(17);
    \u0275\u0275pipe(18, "number");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "div", 7)(20, "span", 8);
    \u0275\u0275text(21, "Utilidad bruta");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "span", 9);
    \u0275\u0275text(23);
    \u0275\u0275pipe(24, "currency");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "span", 12);
    \u0275\u0275text(26);
    \u0275\u0275pipe(27, "number");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "div", 7)(29, "span", 8);
    \u0275\u0275text(30, "Productos stock bajo");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "span", 9);
    \u0275\u0275text(32);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "span", 10);
    \u0275\u0275text(34, "Requieren reposici\xF3n");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(35, "div", 6)(36, "div", 7)(37, "span", 8);
    \u0275\u0275text(38, "Cotizaciones pendientes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "span", 9);
    \u0275\u0275text(40);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "span", 10);
    \u0275\u0275text(42);
    \u0275\u0275pipe(43, "currency");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(44, "div", 7)(45, "span", 8);
    \u0275\u0275text(46, "Devoluciones (mes)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "span", 9);
    \u0275\u0275text(48);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "span", 10);
    \u0275\u0275text(50);
    \u0275\u0275pipe(51, "currency");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(52, "div", 7)(53, "span", 8);
    \u0275\u0275text(54, "Compras del mes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "span", 9);
    \u0275\u0275text(56);
    \u0275\u0275pipe(57, "currency");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "span", 10);
    \u0275\u0275text(59);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "div", 7)(61, "span", 8);
    \u0275\u0275text(62, "Entregas pendientes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(63, "span", 9);
    \u0275\u0275text(64);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(65, "span", 10);
    \u0275\u0275text(66);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(67, "div", 13)(68, "div", 14)(69, "span")(70, "mat-icon", 15);
    \u0275\u0275text(71, "schedule");
    \u0275\u0275elementEnd();
    \u0275\u0275text(72);
    \u0275\u0275pipe(73, "date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(74, "span")(75, "mat-icon", 15);
    \u0275\u0275text(76, "people");
    \u0275\u0275elementEnd();
    \u0275\u0275text(77);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(6, 26, ctx_r0.data().ventasHoy.total, "$"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" ", ctx_r0.data().ventasHoy.cantidad, " \xF3rdenes \xB7 Ticket: ", \u0275\u0275pipeBind2(9, 29, ctx_r0.data().ventasHoy.ticketPromedio, "$"), " ");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(15, 32, ctx_r0.data().ventasMes.total, "$"));
    \u0275\u0275advance(2);
    \u0275\u0275classProp("positive", ctx_r0.data().ventasMes.variacionVsMesAnterior >= 0)("negative", ctx_r0.data().ventasMes.variacionVsMesAnterior < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r0.data().ventasMes.variacionVsMesAnterior >= 0 ? "+" : "", "", \u0275\u0275pipeBind2(18, 35, ctx_r0.data().ventasMes.variacionVsMesAnterior, "1.1-1"), "% vs mes anterior ");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(24, 38, ctx_r0.data().utilidad.utilidadBruta, "$"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("Margen: ", \u0275\u0275pipeBind2(27, 41, ctx_r0.data().utilidad.margenPorcentaje, "1.1-1"), "%");
    \u0275\u0275advance(5);
    \u0275\u0275classProp("text-red-600", ctx_r0.data().productosStockBajo > 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.data().productosStockBajo, " ");
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r0.data().cotizaciones.pendientes);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" Valor: ", \u0275\u0275pipeBind2(43, 44, ctx_r0.data().cotizaciones.valorPendiente, "$"), " ");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r0.data().devoluciones.mes.cantidad);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", \u0275\u0275pipeBind2(51, 47, ctx_r0.data().devoluciones.mes.total, "$"), " \xB7 Hoy: ", ctx_r0.data().devoluciones.hoy.cantidad, " ");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(57, 50, ctx_r0.data().comprasMes.total, "$"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("", ctx_r0.data().comprasMes.cantidad, " \xF3rdenes de compra");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.data().ordenesPendientesEntrega);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Turnos abiertos: ", ctx_r0.data().turnosAbiertos, "");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate1(" Actualizado: ", \u0275\u0275pipeBind2(73, 53, ctx_r0.data().generadoEn, "HH:mm:ss"), " ");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" Sesiones activas: ", ctx_r0.data().sesionesActivas, " ");
  }
}
var DashboardComponent = class _DashboardComponent {
  constructor() {
    this.dashSvc = inject(DashboardService);
    this.notify = inject(NotificationService);
    this.destroyRef = inject(DestroyRef);
    this.data = signal(null);
    this.cargando = signal(false);
  }
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.dashSvc.obtenerKPIs().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (kpis) => {
        this.data.set(kpis);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notify.error("No se pudieron cargar los KPIs");
      }
    });
  }
  static {
    this.\u0275fac = function DashboardComponent_Factory(t) {
      return new (t || _DashboardComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardComponent, selectors: [["app-dashboard"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 9, vars: 1, consts: [[1, "page-container"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "text-2xl", "font-bold", "text-gray-800"], ["mat-icon-button", "", "title", "Actualizar", 3, "click"], [1, "flex", "justify-center", "py-20"], ["diameter", "48"], [1, "kpi-grid"], [1, "kpi-card"], [1, "kpi-label"], [1, "kpi-value"], [1, "text-xs", "text-gray-400"], [1, "kpi-change"], [1, "kpi-change", "positive"], [1, "card", "mt-4"], [1, "flex", "items-center", "gap-4", "text-sm", "text-gray-500"], [1, "text-base", "align-middle"]], template: function DashboardComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "h1", 2);
        \u0275\u0275text(3, "Dashboard");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "button", 3);
        \u0275\u0275listener("click", function DashboardComponent_Template_button_click_4_listener() {
          return ctx.cargar();
        });
        \u0275\u0275elementStart(5, "mat-icon");
        \u0275\u0275text(6, "refresh");
        \u0275\u0275elementEnd()()();
        \u0275\u0275template(7, DashboardComponent_Conditional_7_Template, 2, 0, "div", 4)(8, DashboardComponent_Conditional_8_Template, 78, 56);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(7);
        \u0275\u0275conditional(7, ctx.cargando() ? 7 : ctx.data() ? 8 : -1);
      }
    }, dependencies: [CommonModule, DecimalPipe, CurrencyPipe, DatePipe, MatCardModule, MatIconModule, MatIcon, MatProgressSpinnerModule, MatProgressSpinner, MatButtonModule, MatIconButton, MatDividerModule], styles: ["\n\n/*# sourceMappingURL=dashboard.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardComponent, { className: "DashboardComponent", filePath: "src/app/features/dashboard/dashboard.component.ts", lineNumber: 24 });
})();
export {
  DashboardComponent
};
//# sourceMappingURL=chunk-NTYYMETH.js.map
