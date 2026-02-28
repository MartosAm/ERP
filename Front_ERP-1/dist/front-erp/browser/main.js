import {
  AuthService,
  Router,
  RouterOutlet,
  TokenService,
  provideRouter,
  withViewTransitions
} from "./chunk-QCMV2OHP.js";
import {
  NotificationService
} from "./chunk-KRZCM2EU.js";
import {
  DomRendererFactory2,
  bootstrapApplication,
  environment,
  provideHttpClient,
  withInterceptors
} from "./chunk-QGQLHQW3.js";
import {
  DOCUMENT
} from "./chunk-JVWHMXC2.js";
import {
  ANIMATION_MODULE_TYPE,
  APP_INITIALIZER,
  ChangeDetectionScheduler,
  Injectable,
  NgZone,
  RendererFactory2,
  RuntimeError,
  catchError,
  firstValueFrom,
  inject,
  makeEnvironmentProviders,
  performanceMarkFeature,
  retry,
  setClassMetadata,
  throwError,
  timer,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵinvalidFactory
} from "./chunk-PMZUQMU7.js";

// src/app/app.component.ts
var AppComponent = class _AppComponent {
  static {
    this.\u0275fac = function AppComponent_Factory(t) {
      return new (t || _AppComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppComponent, selectors: [["app-root"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 1, vars: 0, template: function AppComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275element(0, "router-outlet");
      }
    }, dependencies: [RouterOutlet], styles: ["\n\n/*# sourceMappingURL=app.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "src/app/app.component.ts", lineNumber: 11 });
})();

// node_modules/@angular/platform-browser/fesm2022/animations/async.mjs
var ANIMATION_PREFIX = "@";
var AsyncAnimationRendererFactory = class _AsyncAnimationRendererFactory {
  /**
   *
   * @param moduleImpl allows to provide a mock implmentation (or will load the animation module)
   */
  constructor(doc, delegate, zone, animationType, moduleImpl) {
    this.doc = doc;
    this.delegate = delegate;
    this.zone = zone;
    this.animationType = animationType;
    this.moduleImpl = moduleImpl;
    this._rendererFactoryPromise = null;
    this.scheduler = inject(ChangeDetectionScheduler, {
      optional: true
    });
  }
  /** @nodoc */
  ngOnDestroy() {
    this._engine?.flush();
  }
  /**
   * @internal
   */
  loadImpl() {
    const moduleImpl = this.moduleImpl ?? import("./chunk-4S6IUYUX.js");
    return moduleImpl.catch((e) => {
      throw new RuntimeError(5300, (typeof ngDevMode === "undefined" || ngDevMode) && "Async loading for animations package was enabled, but loading failed. Angular falls back to using regular rendering. No animations will be displayed and their styles won't be applied.");
    }).then(({
      \u0275createEngine,
      \u0275AnimationRendererFactory
    }) => {
      this._engine = \u0275createEngine(this.animationType, this.doc, this.scheduler);
      const rendererFactory = new \u0275AnimationRendererFactory(this.delegate, this._engine, this.zone);
      this.delegate = rendererFactory;
      return rendererFactory;
    });
  }
  /**
   * This method is delegating the renderer creation to the factories.
   * It uses default factory while the animation factory isn't loaded
   * and will rely on the animation factory once it is loaded.
   *
   * Calling this method will trigger as side effect the loading of the animation module
   * if the renderered component uses animations.
   */
  createRenderer(hostElement, rendererType) {
    const renderer = this.delegate.createRenderer(hostElement, rendererType);
    if (renderer.\u0275type === 0) {
      return renderer;
    }
    if (typeof renderer.throwOnSyntheticProps === "boolean") {
      renderer.throwOnSyntheticProps = false;
    }
    const dynamicRenderer = new DynamicDelegationRenderer(renderer);
    if (rendererType?.data?.["animation"] && !this._rendererFactoryPromise) {
      this._rendererFactoryPromise = this.loadImpl();
    }
    this._rendererFactoryPromise?.then((animationRendererFactory) => {
      const animationRenderer = animationRendererFactory.createRenderer(hostElement, rendererType);
      dynamicRenderer.use(animationRenderer);
    }).catch((e) => {
      dynamicRenderer.use(renderer);
    });
    return dynamicRenderer;
  }
  begin() {
    this.delegate.begin?.();
  }
  end() {
    this.delegate.end?.();
  }
  whenRenderingDone() {
    return this.delegate.whenRenderingDone?.() ?? Promise.resolve();
  }
  static {
    this.\u0275fac = function AsyncAnimationRendererFactory_Factory(t) {
      \u0275\u0275invalidFactory();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({
      token: _AsyncAnimationRendererFactory,
      factory: _AsyncAnimationRendererFactory.\u0275fac
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AsyncAnimationRendererFactory, [{
    type: Injectable
  }], () => [{
    type: Document
  }, {
    type: RendererFactory2
  }, {
    type: NgZone
  }, {
    type: void 0
  }, {
    type: Promise
  }], null);
})();
var DynamicDelegationRenderer = class {
  constructor(delegate) {
    this.delegate = delegate;
    this.replay = [];
    this.\u0275type = 1;
  }
  use(impl) {
    this.delegate = impl;
    if (this.replay !== null) {
      for (const fn of this.replay) {
        fn(impl);
      }
      this.replay = null;
    }
  }
  get data() {
    return this.delegate.data;
  }
  destroy() {
    this.replay = null;
    this.delegate.destroy();
  }
  createElement(name, namespace) {
    return this.delegate.createElement(name, namespace);
  }
  createComment(value) {
    return this.delegate.createComment(value);
  }
  createText(value) {
    return this.delegate.createText(value);
  }
  get destroyNode() {
    return this.delegate.destroyNode;
  }
  appendChild(parent, newChild) {
    this.delegate.appendChild(parent, newChild);
  }
  insertBefore(parent, newChild, refChild, isMove) {
    this.delegate.insertBefore(parent, newChild, refChild, isMove);
  }
  removeChild(parent, oldChild, isHostElement) {
    this.delegate.removeChild(parent, oldChild, isHostElement);
  }
  selectRootElement(selectorOrNode, preserveContent) {
    return this.delegate.selectRootElement(selectorOrNode, preserveContent);
  }
  parentNode(node) {
    return this.delegate.parentNode(node);
  }
  nextSibling(node) {
    return this.delegate.nextSibling(node);
  }
  setAttribute(el, name, value, namespace) {
    this.delegate.setAttribute(el, name, value, namespace);
  }
  removeAttribute(el, name, namespace) {
    this.delegate.removeAttribute(el, name, namespace);
  }
  addClass(el, name) {
    this.delegate.addClass(el, name);
  }
  removeClass(el, name) {
    this.delegate.removeClass(el, name);
  }
  setStyle(el, style, value, flags) {
    this.delegate.setStyle(el, style, value, flags);
  }
  removeStyle(el, style, flags) {
    this.delegate.removeStyle(el, style, flags);
  }
  setProperty(el, name, value) {
    if (this.shouldReplay(name)) {
      this.replay.push((renderer) => renderer.setProperty(el, name, value));
    }
    this.delegate.setProperty(el, name, value);
  }
  setValue(node, value) {
    this.delegate.setValue(node, value);
  }
  listen(target, eventName, callback) {
    if (this.shouldReplay(eventName)) {
      this.replay.push((renderer) => renderer.listen(target, eventName, callback));
    }
    return this.delegate.listen(target, eventName, callback);
  }
  shouldReplay(propOrEventName) {
    return this.replay !== null && propOrEventName.startsWith(ANIMATION_PREFIX);
  }
};
function provideAnimationsAsync(type = "animations") {
  performanceMarkFeature("NgAsyncAnimations");
  return makeEnvironmentProviders([{
    provide: RendererFactory2,
    useFactory: (doc, renderer, zone) => {
      return new AsyncAnimationRendererFactory(doc, renderer, zone, type);
    },
    deps: [DOCUMENT, DomRendererFactory2, NgZone]
  }, {
    provide: ANIMATION_MODULE_TYPE,
    useValue: type === "noop" ? "NoopAnimations" : "BrowserAnimations"
  }]);
}

// src/app/core/guards/auth.guard.ts
var authGuard = () => {
  const auth = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);
  if (auth.estaAutenticado()) {
    return true;
  }
  tokenService.limpiar();
  return router.createUrlTree(["/auth/login"]);
};

// src/app/core/guards/role.guard.ts
function roleGuard(...roles) {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();
    if (usuario && roles.includes(usuario.rol)) {
      return true;
    }
    return router.createUrlTree(["/dashboard"]);
  };
}

// src/app/app.routes.ts
var routes = [
  // --- Auth (sin layout) ---
  {
    path: "auth/login",
    loadComponent: () => import("./chunk-SW7QFXMT.js").then((m) => m.LoginComponent)
  },
  // --- Rutas protegidas (con layout shell) ---
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () => import("./chunk-OCSWBERP.js").then((m) => m.ShellComponent),
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./chunk-NTYYMETH.js").then((m) => m.DashboardComponent)
      },
      {
        path: "pos",
        loadComponent: () => import("./chunk-HU4EDHHS.js").then((m) => m.PosComponent)
      },
      {
        path: "productos",
        loadComponent: () => import("./chunk-6CGH6G5M.js").then((m) => m.ProductosComponent)
      },
      {
        path: "inventario",
        loadComponent: () => import("./chunk-ENWYWNJN.js").then((m) => m.InventarioComponent)
      },
      {
        path: "clientes",
        loadComponent: () => import("./chunk-SQAPT3AX.js").then((m) => m.ClientesComponent)
      },
      // --- Solo ADMIN ---
      {
        path: "reportes",
        canActivate: [roleGuard("ADMIN")],
        loadComponent: () => import("./chunk-D2E3P4G7.js").then((m) => m.ReportesComponent)
      },
      {
        path: "configuracion",
        canActivate: [roleGuard("ADMIN")],
        loadComponent: () => import("./chunk-CXWKKAGL.js").then((m) => m.ConfiguracionComponent)
      }
    ]
  },
  // --- Wildcard: redirigir a login (authGuard decide si puede ver dashboard) ---
  { path: "**", redirectTo: "auth/login" }
];

// src/app/core/interceptors/auth.interceptor.ts
var authInterceptor = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();
  if (token && !tokenService.estaExpirado()) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};

// src/app/core/interceptors/error.interceptor.ts
var STATUS_TRANSITORIOS = /* @__PURE__ */ new Set([0, 502, 503, 504]);
var METODOS_IDEMPOTENTES = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
var MAX_REINTENTOS = 2;
var DELAY_BASE_MS = 1e3;
var errorInterceptor = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  return next(req).pipe(
    // Retry solo para errores transitorios en métodos idempotentes
    retry({
      count: METODOS_IDEMPOTENTES.has(req.method) ? MAX_REINTENTOS : 0,
      delay: (error, retryCount) => {
        if (STATUS_TRANSITORIOS.has(error.status)) {
          return timer(DELAY_BASE_MS * retryCount);
        }
        return throwError(() => error);
      }
    }),
    catchError((err) => {
      if (req.url.startsWith(environment.apiUrl)) {
        if (err.status === 401) {
          tokenService.limpiar();
          router.navigate(["/auth/login"]);
          notify.error("Sesi\xF3n expirada. Inicia sesi\xF3n nuevamente.");
        } else if (err.status === 403) {
          notify.error("No tienes permisos para realizar esta acci\xF3n.");
        } else if (err.status === 0) {
          notify.error("Error de conexi\xF3n. Verifica tu red.");
        } else if (err.status === 429) {
          notify.error("Demasiadas solicitudes. Espera un momento.");
        } else {
          const mensaje = err.error?.mensaje || err.error?.message || "Error inesperado";
          notify.error(mensaje);
        }
      }
      return throwError(() => err);
    })
  );
};

// src/app/app.config.ts
function inicializarSesion() {
  const auth = inject(AuthService);
  return () => firstValueFrom(auth.validarSesion()).catch(() => {
    return false;
  });
}
var appConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: inicializarSesion,
      multi: true
    }
  ]
};

// src/main.ts
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
/*! Bundled license information:

@angular/platform-browser/fesm2022/animations/async.mjs:
  (**
   * @license Angular v17.3.12
   * (c) 2010-2024 Google LLC. https://angular.io/
   * License: MIT
   *)
*/
//# sourceMappingURL=main.js.map
