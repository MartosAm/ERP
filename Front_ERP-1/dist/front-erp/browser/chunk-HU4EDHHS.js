import {
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵdefineComponent,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵtext
} from "./chunk-PMZUQMU7.js";

// src/app/features/pos/pos.component.ts
var PosComponent = class _PosComponent {
  static {
    this.\u0275fac = function PosComponent_Factory(t) {
      return new (t || _PosComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PosComponent, selectors: [["app-pos"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 5, vars: 0, consts: [[1, "page-container"], [1, "text-2xl", "font-bold", "mb-4"], [1, "text-gray-500"]], template: function PosComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h1", 1);
        \u0275\u0275text(2, "Punto de Venta");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "p", 2);
        \u0275\u0275text(4, "M\xF3dulo POS en desarrollo...");
        \u0275\u0275elementEnd()();
      }
    }, styles: ["\n\n/*# sourceMappingURL=pos.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PosComponent, { className: "PosComponent", filePath: "src/app/features/pos/pos.component.ts", lineNumber: 9 });
})();
export {
  PosComponent
};
//# sourceMappingURL=chunk-HU4EDHHS.js.map
