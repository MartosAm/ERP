import {
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵdefineComponent,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵtext
} from "./chunk-PMZUQMU7.js";

// src/app/features/inventario/inventario.component.ts
var InventarioComponent = class _InventarioComponent {
  static {
    this.\u0275fac = function InventarioComponent_Factory(t) {
      return new (t || _InventarioComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InventarioComponent, selectors: [["app-inventario"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 5, vars: 0, consts: [[1, "page-container"], [1, "text-2xl", "font-bold", "mb-4"], [1, "text-gray-500"]], template: function InventarioComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h1", 1);
        \u0275\u0275text(2, "Inventario");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "p", 2);
        \u0275\u0275text(4, "M\xF3dulo de inventario en desarrollo...");
        \u0275\u0275elementEnd()();
      }
    }, styles: ["\n\n/*# sourceMappingURL=inventario.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InventarioComponent, { className: "InventarioComponent", filePath: "src/app/features/inventario/inventario.component.ts", lineNumber: 9 });
})();
export {
  InventarioComponent
};
//# sourceMappingURL=chunk-ENWYWNJN.js.map
