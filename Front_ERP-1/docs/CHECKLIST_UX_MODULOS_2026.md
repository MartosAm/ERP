# Checklist UX por Modulos 2026

## Objetivo

Estandarizar validacion UX/accesibilidad por modulo para releases candidatas del frontend ERP.

## Criterios globales (aplican a todas las rutas)

- [ ] Estado loading visible y no bloquea teclado innecesariamente.
- [ ] Estado empty con mensaje claro y accion sugerida.
- [ ] Estado error con texto accionable y boton de reintento.
- [ ] Input de busqueda accesible (aria-label, escape limpia, role search).
- [ ] Badges de estado legibles por color y texto.
- [ ] Navegacion por teclado funcional en acciones principales.
- [ ] Contraste minimo aceptable en texto principal/accion.
- [ ] Responsive correcto en 360px, 768px y >=1280px.

## Modulos CRUD

### Productos
Ruta: /productos
- [ ] Tabla legible en desktop y scroll horizontal usable en mobile.
- [ ] Formulario crear/editar con validaciones visibles.
- [ ] Empty state con CTA de crear producto.
- [ ] Acciones editar/eliminar accesibles por teclado.

### Proveedores
Ruta: /proveedores
- [ ] Busqueda por razon social/ruc/contacto usable.
- [ ] Contactos email/telefono con affordance visual claro.
- [ ] Badges de activo/inactivo consistentes.
- [ ] Paginador usable sin solapamientos en mobile.

### Inventario
Ruta: /inventario
- [ ] Tabs de existencias/movimientos navegables por teclado.
- [ ] Ajuste y traslado con feedback de exito/error.
- [ ] Indicadores de stock bajo visibles sin ambiguedad.
- [ ] No hay bloqueos visuales sin estado de carga.

### Almacenes
Ruta: /almacenes
- [ ] Creacion/edicion sin perdida de foco al cerrar dialog.
- [ ] Estado principal/no principal claramente diferenciado.
- [ ] Confirmaciones de eliminacion descriptivas.

### Categorias
Ruta: /categorias
- [ ] Busqueda y paginado estables en cambios rapidos.
- [ ] Mensajes de validacion claros en dialog.

### Clientes
Ruta: /clientes
- [ ] Tabla + filtros con feedback inmediato.
- [ ] Vista detalle con jerarquia visual clara.

## Modulos transaccionales

### Ordenes
Ruta: /ordenes
- [ ] Chips de estado entendibles por texto y color.
- [ ] Detalle de orden legible y priorizado.
- [ ] Acciones criticas (cancelar/devolver) piden confirmacion.

### Compras
Ruta: /compras
- [ ] Estado recibida/pendiente visible en lista y detalle.
- [ ] Flujo de recibir mercancia con confirmacion clara.

### Entregas
Ruta: /entregas
- [ ] Timeline/estado de entrega comprensible.
- [ ] Transiciones de estado guiadas por contexto.

### Turnos de Caja
Ruta: /turnos-caja
- [ ] Banner de turno activo visible.
- [ ] Diferencias de cierre resaltadas claramente.

## Modulos de soporte

### Auth
Rutas: /login, /registro
- [ ] Labels, errores y foco inicial correctos.
- [ ] Mensajes de error autenticacion claros y no tecnicos.

### Dashboard y Reportes
Rutas: /dashboard, /reportes
- [ ] KPIs no dependen solo de color para comunicar estado.
- [ ] Graficos mantienen legibilidad en mobile.

## Evidencia minima por release

Para aprobar UX en release candidata:
1. Capturas desktop + mobile de rutas core.
2. Resultado checklist firmado por QA/Frontend.
3. Lista de incidencias UX abiertas con severidad.
4. Decision Go/No-Go basada en incidencias criticas.
