import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatPaginator,
  MatPaginatorModule,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableModule
} from "./chunk-625N66VP.js";
import {
  MatFormField,
  MatFormFieldModule,
  MatInput,
  MatInputModule,
  MatLabel,
  MatSuffix
} from "./chunk-PRRJ5RHV.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
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
  ApiService
} from "./chunk-QGQLHQW3.js";
import {
  CommonModule,
  CurrencyPipe
} from "./chunk-JVWHMXC2.js";
import {
  inject,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-PMZUQMU7.js";

// src/app/core/services/clientes.service.ts
var ClientesService = class _ClientesService {
  constructor() {
    this.api = inject(ApiService);
  }
  listar(params) {
    return this.api.getPaginado("clientes", params);
  }
  obtenerPorId(id) {
    return this.api.get(`clientes/${id}`);
  }
  crear(data) {
    return this.api.post("clientes", data);
  }
  actualizar(id, data) {
    return this.api.patch(`clientes/${id}`, data);
  }
  eliminar(id) {
    return this.api.delete(`clientes/${id}`);
  }
  static {
    this.\u0275fac = function ClientesService_Factory(t) {
      return new (t || _ClientesService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ClientesService, factory: _ClientesService.\u0275fac, providedIn: "root" });
  }
};

// src/app/features/clientes/clientes.component.ts
var _c0 = () => [10, 20, 50];
function ClientesComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 7);
    \u0275\u0275element(1, "mat-spinner", 8);
    \u0275\u0275elementEnd();
  }
}
function ClientesComponent_Conditional_12_th_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "th", 21);
    \u0275\u0275text(1, "Nombre");
    \u0275\u0275elementEnd();
  }
}
function ClientesComponent_Conditional_12_td_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "td", 22);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r1 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r1.nombre);
  }
}
function ClientesComponent_Conditional_12_th_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "th", 21);
    \u0275\u0275text(1, "Tel\xE9fono");
    \u0275\u0275elementEnd();
  }
}
function ClientesComponent_Conditional_12_td_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "td", 22);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r2 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r2.telefono || "\u2014");
  }
}
function ClientesComponent_Conditional_12_th_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "th", 21);
    \u0275\u0275text(1, "Correo");
    \u0275\u0275elementEnd();
  }
}
function ClientesComponent_Conditional_12_td_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "td", 22);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r3 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r3.correo || "\u2014");
  }
}
function ClientesComponent_Conditional_12_th_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "th", 21);
    \u0275\u0275text(1, "Cr\xE9dito disponible");
    \u0275\u0275elementEnd();
  }
}
function ClientesComponent_Conditional_12_td_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "td", 22);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "currency");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r4 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(2, 1, c_r4.limiteCredito - c_r4.creditoUtilizado, "$"));
  }
}
function ClientesComponent_Conditional_12_tr_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "tr", 23);
  }
}
function ClientesComponent_Conditional_12_tr_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "tr", 24);
  }
}
function ClientesComponent_Conditional_12_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 19)(1, "mat-icon", 25);
    \u0275\u0275text(2, "people_outline");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "No se encontraron clientes");
    \u0275\u0275elementEnd()();
  }
}
function ClientesComponent_Conditional_12_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "mat-paginator", 26);
    \u0275\u0275listener("page", function ClientesComponent_Conditional_12_Conditional_17_Template_mat_paginator_page_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onPage($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r5 = \u0275\u0275nextContext(2);
    \u0275\u0275property("length", ctx_r5.meta().total)("pageSize", ctx_r5.meta().limite)("pageIndex", ctx_r5.meta().pagina - 1)("pageSizeOptions", \u0275\u0275pureFunction0(4, _c0));
  }
}
function ClientesComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 9)(1, "table", 10);
    \u0275\u0275elementContainerStart(2, 11);
    \u0275\u0275template(3, ClientesComponent_Conditional_12_th_3_Template, 2, 0, "th", 12)(4, ClientesComponent_Conditional_12_td_4_Template, 2, 1, "td", 13);
    \u0275\u0275elementContainerEnd();
    \u0275\u0275elementContainerStart(5, 14);
    \u0275\u0275template(6, ClientesComponent_Conditional_12_th_6_Template, 2, 0, "th", 12)(7, ClientesComponent_Conditional_12_td_7_Template, 2, 1, "td", 13);
    \u0275\u0275elementContainerEnd();
    \u0275\u0275elementContainerStart(8, 15);
    \u0275\u0275template(9, ClientesComponent_Conditional_12_th_9_Template, 2, 0, "th", 12)(10, ClientesComponent_Conditional_12_td_10_Template, 2, 1, "td", 13);
    \u0275\u0275elementContainerEnd();
    \u0275\u0275elementContainerStart(11, 16);
    \u0275\u0275template(12, ClientesComponent_Conditional_12_th_12_Template, 2, 0, "th", 12)(13, ClientesComponent_Conditional_12_td_13_Template, 3, 4, "td", 13);
    \u0275\u0275elementContainerEnd();
    \u0275\u0275template(14, ClientesComponent_Conditional_12_tr_14_Template, 1, 0, "tr", 17)(15, ClientesComponent_Conditional_12_tr_15_Template, 1, 0, "tr", 18);
    \u0275\u0275elementEnd();
    \u0275\u0275template(16, ClientesComponent_Conditional_12_Conditional_16_Template, 5, 0, "div", 19)(17, ClientesComponent_Conditional_12_Conditional_17_Template, 1, 5, "mat-paginator", 20);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r5 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("dataSource", ctx_r5.clientes());
    \u0275\u0275advance(13);
    \u0275\u0275property("matHeaderRowDef", ctx_r5.columnas);
    \u0275\u0275advance();
    \u0275\u0275property("matRowDefColumns", ctx_r5.columnas);
    \u0275\u0275advance();
    \u0275\u0275conditional(16, ctx_r5.clientes().length === 0 ? 16 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(17, ctx_r5.meta() ? 17 : -1);
  }
}
var ClientesComponent = class _ClientesComponent {
  constructor() {
    this.svc = inject(ClientesService);
    this.clientes = signal([]);
    this.meta = signal(null);
    this.cargando = signal(false);
    this.columnas = ["nombre", "telefono", "correo", "credito"];
    this.buscar = "";
    this.pagina = 1;
    this.limite = 20;
  }
  ngOnInit() {
    this.cargar();
  }
  /** Buscar: resetea a primera página y recarga */
  onBuscar() {
    this.pagina = 1;
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.svc.listar({ pagina: this.pagina, limite: this.limite, buscar: this.buscar }).subscribe({
      next: (res) => {
        this.clientes.set(res.datos);
        this.meta.set(res.meta);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }
  onPage(ev) {
    this.pagina = ev.pageIndex + 1;
    this.limite = ev.pageSize;
    this.cargar();
  }
  static {
    this.\u0275fac = function ClientesComponent_Factory(t) {
      return new (t || _ClientesComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ClientesComponent, selectors: [["app-clientes"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 13, vars: 2, consts: [[1, "page-container"], [1, "card-header"], [1, "card-title", "text-2xl"], [1, "card", "mb-4"], ["appearance", "outline", 1, "w-full"], ["matInput", "", "placeholder", "Nombre, tel\xE9fono...", 3, "ngModelChange", "keyup.enter", "ngModel"], ["matSuffix", ""], [1, "flex", "justify-center", "py-10"], ["diameter", "40"], [1, "card", "overflow-x-auto"], ["mat-table", "", 1, "w-full", 3, "dataSource"], ["matColumnDef", "nombre"], ["mat-header-cell", "", 4, "matHeaderCellDef"], ["mat-cell", "", 4, "matCellDef"], ["matColumnDef", "telefono"], ["matColumnDef", "correo"], ["matColumnDef", "credito"], ["mat-header-row", "", 4, "matHeaderRowDef"], ["mat-row", "", "class", "hover:bg-gray-50 cursor-pointer", 4, "matRowDef", "matRowDefColumns"], [1, "text-center", "py-10", "text-gray-500"], ["showFirstLastButtons", "", 3, "length", "pageSize", "pageIndex", "pageSizeOptions"], ["mat-header-cell", ""], ["mat-cell", ""], ["mat-header-row", ""], ["mat-row", "", 1, "hover:bg-gray-50", "cursor-pointer"], [1, "text-5xl", "mb-2"], ["showFirstLastButtons", "", 3, "page", "length", "pageSize", "pageIndex", "pageSizeOptions"]], template: function ClientesComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "h1", 2);
        \u0275\u0275text(3, "Clientes");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(4, "div", 3)(5, "mat-form-field", 4)(6, "mat-label");
        \u0275\u0275text(7, "Buscar cliente");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "input", 5);
        \u0275\u0275twoWayListener("ngModelChange", function ClientesComponent_Template_input_ngModelChange_8_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.buscar, $event) || (ctx.buscar = $event);
          return $event;
        });
        \u0275\u0275listener("keyup.enter", function ClientesComponent_Template_input_keyup_enter_8_listener() {
          return ctx.onBuscar();
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "mat-icon", 6);
        \u0275\u0275text(10, "search");
        \u0275\u0275elementEnd()()();
        \u0275\u0275template(11, ClientesComponent_Conditional_11_Template, 2, 0, "div", 7)(12, ClientesComponent_Conditional_12_Template, 18, 5);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(8);
        \u0275\u0275twoWayProperty("ngModel", ctx.buscar);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(11, ctx.cargando() ? 11 : 12);
      }
    }, dependencies: [CommonModule, CurrencyPipe, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, MatTableModule, MatTable, MatHeaderCellDef, MatHeaderRowDef, MatColumnDef, MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow, MatPaginatorModule, MatPaginator, MatFormFieldModule, MatFormField, MatLabel, MatSuffix, MatInputModule, MatInput, MatIconModule, MatIcon, MatProgressSpinnerModule, MatProgressSpinner], styles: ["\n\n/*# sourceMappingURL=clientes.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ClientesComponent, { className: "ClientesComponent", filePath: "src/app/features/clientes/clientes.component.ts", lineNumber: 24 });
})();
export {
  ClientesComponent
};
//# sourceMappingURL=chunk-SQAPT3AX.js.map
