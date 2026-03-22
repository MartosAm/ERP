# PLAN DE REFACTORIZACIÓN UI/UX - FRONTEND ERP (Patrón Atómico)

Este documento detalla el plan estratégico para refactorizar la interfaz de usuario (UI) y la experiencia de usuario (UX) del proyecto Front_ERP-1, basándonos en los principios del **Diseño Atómico (Atomic Design)**.

## OBJETIVOS:
1.  **Diseño Atractivo y Moderno:** Interfaz profesional, limpia, orientada a aplicaciones de tipo ERP.
2.  **Excelente UX:** Rutas intuitivas, feedback visual inmediato, optimización de espacios funcionales.
3.  **Animaciones Fluidas:** Transiciones suaves de estado y elementos, feedback para interacciones del usuario.
4.  **Arquitectura Sólida:** Uso del Patrón Atómico para maximizar la reutilización y el mantenimiento.

## FASES DE IMPLEMENTACIÓN

### Fase 1: Configuración y Estructura Base
- [ ] 1.1 **Definición de Escala de Colores/Tema:** Paleta moderna (Primary: Indigo/Blue interactivo, Secondary: Slate/Gray limpio, Accent: Esmerald/Cyan).
- [ ] 1.2 **Configuración de Tailwind:** Extender la configuración (`tailwind.config.js`) con sombras personalizadas, animaciones (`fade-in`, `slide-up`, `spin-slow`), y fuentes legibles (ej. Inter o Poppins).
- [ ] 1.3 **Estructura Atómica de Directorios:** Crear scaffolding de `shared/components`:
    - `/atoms`: Botones, Inputs, Badges, Loaders, Labels.
    - `/molecules`: Combos input-label, Tarjetas simples, Botones con íconos, Alertas, Searchbars.
    - `/organisms`: Formularios completos, Tablas de datos, Navbars, Sidebars, Modales.
    - `/templates`: Estructuras de Layout principales (Backoffice Layout, Auth Layout).
- [ ] 1.4 **Estilos Globales (`styles.css` / `globals.css`):** Resets base, directivas Tailwind personalizadas, y utilidades de scrollbar y animaciones globales.

### Fase 2: Desarrollo de "Atomos" y "Moléculas" (Core UI)
- [ ] 2.1 **Átomos:** 
    - `ButtonComponent` (variantes: primary, outline, ghost, danger).
    - `InputTextComponent`, `CheckboxComponent`, `BadgeComponent`, `SpinnerComponent`.
- [ ] 2.2 **Moléculas:** 
    - `FormFieldComponent` (Input + Label + Mensaje de error).
    - `CardComponent` (Layout de tarjeta contenedora con header y body).
    - `AlertMessageComponent` (Feedback de success/error).

### Fase 3: Refactorización Módulo de Autenticación (Login & Register)
- [ ] 3.1 **Template de Autenticación:** Fondo moderno (split-screen o gradiente sutil con Glassmorfismo).
- [ ] 3.2 **Organismos de Formulario:** 
    - `LoginFormComponent`.
    - `RegisterFormComponent` (si aplica).
- [ ] 3.3 **Animación de entrada:** Aplicar efectos *fade-in-up* sutiles al cargar las pantallas.
- [ ] 3.4 **Páginas de Auth:** Integrar templates y organismos en la ruta principal.

### Fase 4: Layout Principal y Navegación (Dashboard)
- [ ] 4.1 **Atmosfera del Dashboard:** Refactorizar el Sidebar y Header Superior (Organisms).
- [ ] 4.2 **Interacciones del Sidebar:** Minimizable, smooth transitions, íconos legibles, y estado activo claro.
- [ ] 4.3 **Header Global:** Perfil de usuario (Dropdown molecule), barra de búsqueda global (Molecule).
- [ ] 4.4 **Template Layout:** Estructura que envuelve a todas las páginas autenticadas (`<router-outlet>` container).

### Fase 5: Refactorización por Módulos (CRUDs ERP)
Esta fase transforma las pantallas de administración de entidades:
- [ ] 5.1 **Módulo Usuarios / Perfil:** Organismo `DataTable` y Modales de Edición Atómicos.
- [ ] 5.2 **Módulos Core (Inventario, Almacenes, Categorías, Productos):** Implementar filtros de búsqueda avanzados, paginación suave, Tooltips, Empty States amigables.
- [ ] 5.3 **Módulo de Compras, Órdenes, Entregas:** Diseñar timelines visuales para estados de las órdenes, insignias (badges) de estado codificadas por colores.
- [ ] 5.4 **Módulo Caja y Reportes:** Gráficos integrados suavemente, tarjetas de resumen (*Widgets* / Moléculas estadísticas).

### Fase 6: Pulido UX y Microinteracciones
- [ ] 6.1 Integra un sistema de Notificaciones (Toasts) global en la esquina.
- [ ] 6.2 Skeleton Loaders en vez de Spinners para cargas de tablas grandes.
- [ ] 6.3 Validaciones de formularios en tiempo real con retroalimentación en transiciones.
- [ ] 6.4 Auditoría de contraste y usabilidad en dispositivos de todos los tamaños (Mobile Responsiveness de Tailwind).

## SEGUIMIENTO
*El progreso se reportará en los commits y en el sistema de tareas (`manage_todo_list`). Ejecutaremos el plan paso a paso, comenzando por las fases 1 a 3.*
