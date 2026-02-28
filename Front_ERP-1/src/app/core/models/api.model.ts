/**
 * core/models/api.model.ts
 * ------------------------------------------------------------------
 * Tipos e interfaces que modelan EXACTAMENTE las respuestas JSON
 * del backend ERP. Cada sección corresponde a un módulo del API.
 *
 * Convenciones:
 *  - Los nombres coinciden con los modelos Prisma del backend.
 *  - Los campos Decimal de Prisma se tipan como `number`.
 *  - Las fechas llegan como ISO strings (`string`).
 *  - Los campos opcionales/nullable usan `| null`.
 *  - Las relaciones anidadas reflejan el include/select de Prisma.
 *  - Los DTOs (payloads de creación/actualización) llevan sufijo Dto.
 * ------------------------------------------------------------------
 */

// ═══════════════════════════════════════════════════════════════════
//  RESPUESTA API — Wrapper genérico del backend
// ═══════════════════════════════════════════════════════════════════

/** Respuesta exitosa estándar del backend */
export interface ApiResponse<T> {
  exito: boolean;
  datos: T;
  mensaje: string;
  meta: PaginacionMeta | null;
}

/** Respuesta paginada (misma estructura, meta siempre presente) */
export interface ApiPaginada<T> {
  exito: boolean;
  datos: T[];
  mensaje: string;
  meta: PaginacionMeta;
}

/** Respuesta de error del backend */
export interface ApiError {
  exito: false;
  datos: null;
  error: {
    mensaje: string;
    codigo: string;
    detalles: unknown;
  };
}

/** Meta de paginación */
export interface PaginacionMeta {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  tieneSiguiente: boolean;
  tieneAnterior: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  ENUMS — Coinciden con los enums de Prisma
// ═══════════════════════════════════════════════════════════════════

export type Rol = 'ADMIN' | 'CAJERO' | 'REPARTIDOR';

export type TipoUnidad =
  | 'PIEZA'
  | 'METRO'
  | 'KILO'
  | 'LITRO'
  | 'AREA'
  | 'CAJA'
  | 'SERVICIO';

export type TipoMovimiento =
  | 'ENTRADA'
  | 'SALIDA_VENTA'
  | 'AJUSTE_MANUAL'
  | 'DEVOLUCION'
  | 'MERMA'
  | 'TRASLADO';

export type EstadoOrden =
  | 'COTIZACION'
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'DEVUELTA';

export type MetodoPago =
  | 'EFECTIVO'
  | 'TARJETA_DEBITO'
  | 'TARJETA_CREDITO'
  | 'TRANSFERENCIA'
  | 'CREDITO_CLIENTE'
  | 'MIXTO';

export type EstadoEntrega =
  | 'ASIGNADO'
  | 'EN_RUTA'
  | 'ENTREGADO'
  | 'NO_ENTREGADO'
  | 'REPROGRAMADO';

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════

/** Payload de login */
export interface LoginRequest {
  correo: string;
  contrasena: string;
}

/** Respuesta de POST /auth/login — datos dentro de ApiResponse.datos */
export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

/** Usuario autenticado (retornado en login y guardado en sesión) */
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  avatarUrl: string | null;
  empresa: {
    id: string;
    nombre: string;
  };
}

/** Perfil completo del usuario (GET /auth/perfil) */
export interface PerfilUsuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  telefono: string | null;
  avatarUrl: string | null;
  horarioInicio: string | null;
  horarioFin: string | null;
  diasLaborales: number[];
  ultimoLoginEn: string | null;
  creadoEn: string;
  empresa: {
    id: string;
    nombre: string;
    moneda: string;
    tasaImpuesto: number;
  };
}

/** Payload de POST /auth/registro */
export interface RegistroUsuarioDto {
  nombre: string;
  correo: string;
  contrasena: string;
  rol?: Rol;
  telefono?: string;
  horarioInicio?: string;
  horarioFin?: string;
  diasLaborales?: number[];
}

// ═══════════════════════════════════════════════════════════════════
//  CATEGORIAS
// ═══════════════════════════════════════════════════════════════════

/** Categoría en listados (GET /categorias) */
export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  padreId: string | null;
  colorHex: string | null;
  nombreIcono: string | null;
  activo: boolean;
  orden: number;
  creadoEn: string;
  padre: { id: string; nombre: string } | null;
  _count: { productos: number; hijos: number };
}

/** Categoría con detalle (GET /categorias/:id) */
export interface CategoriaDetalle extends Omit<Categoria, '_count'> {
  hijos: Array<{
    id: string;
    nombre: string;
    activo: boolean;
    orden: number;
  }>;
  _count: { productos: number };
}

/** Nodo del árbol de categorías (GET /categorias/arbol) */
export interface CategoriaArbol {
  id: string;
  nombre: string;
  colorHex: string | null;
  nombreIcono: string | null;
  orden: number;
  hijos: Array<{
    id: string;
    nombre: string;
    colorHex: string | null;
    nombreIcono: string | null;
    orden: number;
    _count: { productos: number };
  }>;
  _count: { productos: number };
}

/** DTO para crear/actualizar categoría */
export interface CategoriaDto {
  nombre: string;
  descripcion?: string;
  padreId?: string;
  colorHex?: string;
  nombreIcono?: string;
  orden?: number;
  activo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  PRODUCTOS
// ═══════════════════════════════════════════════════════════════════

/** Producto en listados (GET /productos) */
export interface Producto {
  id: string;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  tipoUnidad: TipoUnidad;
  etiquetaUnidad: string;
  precioCosto: number | null;
  precioVenta1: number;
  precioVenta2: number | null;
  precioVenta3: number | null;
  impuestoIncluido: boolean;
  tasaImpuesto: number;
  rastrearInventario: boolean;
  stockMinimo: number;
  activo: boolean;
  destacado: boolean;
  imagenUrl: string | null;
  creadoEn: string;
  categoria: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  _count: { existencias: number };
}

/** Producto con detalle completo (GET /productos/:id) */
export interface ProductoDetalle extends Producto {
  modelo: string | null;
  conversionUnidad: number | null;
  cantidadMinimaVenta: number;
  incrementoVenta: number;
  stockMaximo: number | null;
  notas: string | null;
  actualizadoEn: string;
  existencias: Array<{
    id: string;
    cantidad: number;
    almacen: { id: string; nombre: string; esPrincipal: boolean };
  }>;
}

/** Producto para búsqueda POS (GET /productos/codigo/:codigo) */
export interface ProductoPOS {
  id: string;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  precioVenta1: number;
  precioVenta2: number | null;
  precioVenta3: number | null;
  impuestoIncluido: boolean;
  tasaImpuesto: number;
  tipoUnidad: TipoUnidad;
  etiquetaUnidad: string;
  cantidadMinimaVenta: number;
  incrementoVenta: number;
  imagenUrl: string | null;
  rastrearInventario: boolean;
  existencias: Array<{
    cantidad: number;
    almacen: { id: string; nombre: string };
  }>;
}

/** DTO para crear producto (POST /productos) */
export interface CrearProductoDto {
  nombre: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  marca?: string;
  modelo?: string;
  categoriaId?: string;
  proveedorId?: string;
  tipoUnidad?: TipoUnidad;
  etiquetaUnidad?: string;
  conversionUnidad?: number;
  cantidadMinimaVenta?: number;
  incrementoVenta?: number;
  precioCosto: number;
  precioVenta1: number;
  precioVenta2?: number;
  precioVenta3?: number;
  impuestoIncluido?: boolean;
  tasaImpuesto?: number;
  rastrearInventario?: boolean;
  stockMinimo?: number;
  stockMaximo?: number;
  notas?: string;
  imagenUrl?: string;
}

/** DTO para actualizar producto (PATCH /productos/:id) */
export type ActualizarProductoDto = Partial<CrearProductoDto> & {
  activo?: boolean;
  destacado?: boolean;
};

// ═══════════════════════════════════════════════════════════════════
//  CLIENTES
// ═══════════════════════════════════════════════════════════════════

/** Cliente en listados (GET /clientes) */
export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  rfc: string | null;
  activo: boolean;
  limiteCredito: number;
  creditoUtilizado: number;
  diasCredito: number;
  creadoEn: string;
  _count: { ordenes: number };
}

/** Cliente con detalle (GET /clientes/:id) */
export interface ClienteDetalle extends Cliente {
  notas: string | null;
  actualizadoEn: string;
  _count: { ordenes: number; entregas: number };
}

/** DTO para crear/actualizar cliente */
export interface ClienteDto {
  nombre: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  rfc?: string;
  notas?: string;
  limiteCredito?: number;
  diasCredito?: number;
  activo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  PROVEEDORES
// ═══════════════════════════════════════════════════════════════════

/** Proveedor en listados (GET /proveedores) */
export interface Proveedor {
  id: string;
  nombre: string;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  rfc: string | null;
  activo: boolean;
  creadoEn: string;
  _count: { productos: number; compras: number };
}

/** Proveedor con detalle (GET /proveedores/:id) */
export interface ProveedorDetalle extends Proveedor {
  notas: string | null;
  actualizadoEn: string;
}

/** DTO para crear/actualizar proveedor */
export interface ProveedorDto {
  nombre: string;
  nombreContacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  rfc?: string;
  notas?: string;
  activo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  ALMACENES
// ═══════════════════════════════════════════════════════════════════

/** Almacén en listados (GET /almacenes) */
export interface Almacen {
  id: string;
  nombre: string;
  direccion: string | null;
  esPrincipal: boolean;
  activo: boolean;
  creadoEn: string;
  _count: { existencias: number };
}

/** Almacén con detalle (GET /almacenes/:id) */
export interface AlmacenDetalle extends Almacen {
  _count: { existencias: number; movimientos: number };
}

/** DTO para crear/actualizar almacén */
export interface AlmacenDto {
  nombre: string;
  direccion?: string;
  esPrincipal?: boolean;
  activo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  ORDENES / VENTAS / COTIZACIONES
// ═══════════════════════════════════════════════════════════════════

/** Orden en listados (GET /ordenes) */
export interface Orden {
  id: string;
  numeroOrden: string;
  estado: EstadoOrden;
  clienteId: string | null;
  subtotal: number;
  montoImpuesto: number;
  montoDescuento: number;
  total: number;
  metodoPago: MetodoPago;
  montoPagado: number;
  cambio: number;
  pagado: boolean;
  notas: string | null;
  motivoCancelacion: string | null;
  creadoEn: string;
  actualizadoEn: string;
  cliente: { id: string; nombre: string } | null;
  creadoPor: { id: string; nombre: string };
  _count: { detalles: number };
}

/** Orden con detalle completo (GET /ordenes/:id) */
export interface OrdenDetalle extends Omit<Orden, '_count'> {
  cajaRegistradoraId: string | null;
  turnoCajaId: string | null;
  creadoPorId: string;
  detalles: DetalleOrden[];
  pagos: Pago[];
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  cajaRegistradora: { id: string; nombre: string } | null;
  entrega: Entrega | null;
}

/** Orden recién creada (POST /ordenes) — incluye detalles y pagos */
export interface OrdenCreada extends Omit<Orden, '_count'> {
  detalles: DetalleOrden[];
  pagos: Pago[];
}

/** Detalle de línea de orden */
export interface DetalleOrden {
  id: string;
  ordenId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  precioCosto: number;
  descuento: number;
  tasaImpuesto: number;
  subtotal: number;
  producto: { id: string; nombre: string; sku: string; imagenUrl: string | null };
}

/** Pago asociado a una orden */
export interface Pago {
  id: string;
  ordenId: string;
  metodo: MetodoPago;
  monto: number;
  referencia: string | null;
  pagadoEn: string;
}

/** DTO para crear venta (POST /ordenes) */
export interface CrearOrdenDto {
  clienteId?: string;
  detalles: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
  }>;
  pagos: Array<{
    metodo: MetodoPago;
    monto: number;
    referencia?: string;
  }>;
  notas?: string;
}

/** DTO para crear cotización (POST /ordenes/cotizacion) */
export interface CrearCotizacionDto {
  clienteId?: string;
  detalles: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
  }>;
  notas?: string;
  validaHasta?: string;
}

/** DTO para confirmar cotización (POST /ordenes/:id/confirmar) */
export interface ConfirmarCotizacionDto {
  pagos: Array<{
    metodo: MetodoPago;
    monto: number;
    referencia?: string;
  }>;
}

/** DTO para cancelar orden (POST /ordenes/:id/cancelar) */
export interface CancelarOrdenDto {
  motivoCancelacion: string;
}

/** DTO para devolución (POST /ordenes/:id/devolver) */
export interface DevolucionDto {
  motivo: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    motivo: string;
  }>;
}

/** Resultado de devolución */
export interface DevolucionResult {
  orden: Orden;
  tipo: 'TOTAL' | 'PARCIAL';
  montoDevolucion: number;
  itemsDevueltos: number;
}

// ═══════════════════════════════════════════════════════════════════
//  COMPRAS
// ═══════════════════════════════════════════════════════════════════

/** Compra en listados (GET /compras) */
export interface Compra {
  id: string;
  proveedorId: string;
  numeroCompra: string;
  numeroFactura: string | null;
  subtotal: number;
  montoImpuesto: number;
  total: number;
  notas: string | null;
  recibidaEn: string | null;
  creadoEn: string;
  proveedor: { id: string; nombre: string };
  _count: { detalles: number };
}

/** Compra con detalle (GET /compras/:id) */
export interface CompraDetalle extends Omit<Compra, '_count'> {
  detalles: DetalleCompra[];
  proveedor: { id: string; nombre: string; nombreContacto: string | null };
}

/** Compra recién creada (POST /compras) */
export interface CompraCreada extends Omit<Compra, '_count'> {
  detalles: DetalleCompra[];
}

/** Detalle de línea de compra */
export interface DetalleCompra {
  id: string;
  compraId: string;
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  producto: { id: string; nombre: string; sku: string };
}

/** DTO para crear compra (POST /compras) */
export interface CrearCompraDto {
  proveedorId: string;
  numeroFactura?: string;
  detalles: Array<{
    productoId: string;
    cantidad: number;
    costoUnitario: number;
  }>;
  notas?: string;
}

/** DTO para recibir compra (POST /compras/:id/recibir) */
export interface RecibirCompraDto {
  almacenId: string;
}

// ═══════════════════════════════════════════════════════════════════
//  ENTREGAS
// ═══════════════════════════════════════════════════════════════════

/** Entrega en listados (GET /entregas) */
export interface Entrega {
  id: string;
  ordenId: string;
  clienteId: string | null;
  asignadoAId: string | null;
  estado: EstadoEntrega;
  direccionEntrega: string;
  programadaEn: string | null;
  entregadaEn: string | null;
  notas: string | null;
  firmaUrl: string | null;
  fotoUrl: string | null;
  motivoFallo: string | null;
  creadoEn: string;
  actualizadoEn: string;
  orden: { id: string; numeroOrden: string; total: number };
  cliente: { id: string; nombre: string } | null;
  asignadoA: { id: string; nombre: string } | null;
}

/** Entrega con detalle (GET /entregas/:id) */
export interface EntregaDetalle extends Entrega {
  orden: { id: string; numeroOrden: string; total: number; estado: EstadoOrden };
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
    direccion: string | null;
  } | null;
}

/** Entrega del repartidor (GET /entregas/mis-entregas) */
export interface EntregaRepartidor extends Omit<Entrega, 'asignadoA'> {
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
    direccion: string | null;
  } | null;
}

/** DTO para crear entrega (POST /entregas) */
export interface CrearEntregaDto {
  ordenId: string;
  asignadoAId?: string;
  direccionEntrega: string;
  programadaEn?: string;
  notas?: string;
}

/** DTO para actualizar estado (PATCH /entregas/:id/estado) */
export interface ActualizarEstadoEntregaDto {
  estado: EstadoEntrega;
  motivoFallo?: string;
  programadaEn?: string;
  notas?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  INVENTARIO
// ═══════════════════════════════════════════════════════════════════

/** Existencia de producto en almacén (GET /inventario/existencias) */
export interface Existencia {
  id: string;
  cantidad: number;
  actualizadoEn: string;
  producto: {
    id: string;
    sku: string;
    nombre: string;
    stockMinimo: number;
    etiquetaUnidad: string;
    imagenUrl: string | null;
  };
  almacen: {
    id: string;
    nombre: string;
    esPrincipal: boolean;
  };
}

/** Movimiento de inventario (GET /inventario/movimientos) */
export interface MovimientoInventario {
  id: string;
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  cantidadAnterior: number;
  cantidadPosterior: number;
  costoUnitario: number | null;
  motivo: string | null;
  referenciaId: string | null;
  referenciaTipo: string | null;
  creadoEn: string;
  producto: { id: string; nombre: string; sku: string };
  almacen: { id: string; nombre: string };
  almacenDestino: { id: string; nombre: string } | null;
  usuario: { id: string; nombre: string };
}

/** DTO para ajuste manual (POST /inventario/movimientos) */
export interface AjusteManualDto {
  productoId: string;
  almacenId: string;
  cantidad: number;
  motivo: string;
}

/** DTO para traslado entre almacenes (POST /inventario/movimientos) */
export interface TrasladoDto {
  productoId: string;
  almacenOrigenId: string;
  almacenDestinoId: string;
  cantidad: number;
  motivo?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  TURNOS DE CAJA
// ═══════════════════════════════════════════════════════════════════

/** Turno de caja (GET /turnos-caja/:id y listados) */
export interface TurnoCaja {
  id: string;
  cajaRegistradoraId: string;
  usuarioId: string;
  montoApertura: number;
  montoCierre: number | null;
  montoEsperado: number | null;
  diferencia: number | null;
  abiertaEn: string;
  cerradaEn: string | null;
  notas: string | null;
  cajaRegistradora: { id: string; nombre: string };
  usuario: { id: string; nombre: string };
  _count?: { ordenes: number };
}

/** DTO para abrir turno (POST /turnos-caja/abrir) */
export interface AbrirTurnoDto {
  cajaRegistradoraId: string;
  montoApertura: number;
}

/** DTO para cerrar turno (POST /turnos-caja/:id/cerrar) */
export interface CerrarTurnoDto {
  montoCierre: number;
  notas?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  USUARIOS (Administración)
// ═══════════════════════════════════════════════════════════════════

/** Usuario en listados admin (GET /usuarios) */
export interface UsuarioAdmin {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  telefono: string | null;
  avatarUrl: string | null;
  horarioInicio: string | null;
  horarioFin: string | null;
  diasLaborales: number[];
  ultimoLoginEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
  _count: { sesiones: number; ordenesCreadas: number };
}

/** Usuario admin con detalle (GET /usuarios/:id) */
export interface UsuarioAdminDetalle extends UsuarioAdmin {
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  creadoPorId: string | null;
  _count: {
    sesiones: number;
    ordenesCreadas: number;
    turnosCaja: number;
    entregas: number;
  };
}

/** DTO para actualizar usuario (PUT /usuarios/:id) */
export interface ActualizarUsuarioDto {
  nombre?: string;
  telefono?: string;
  rol?: Rol;
  activo?: boolean;
}

/** DTO para asignar horario (PUT /usuarios/:id/horario) */
export interface AsignarHorarioDto {
  horarioInicio?: string;
  horarioFin?: string;
  diasLaborales?: number[];
}

/** DTO para cambiar estado (PATCH /usuarios/:id/estado) */
export interface CambiarEstadoUsuarioDto {
  activo: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  REPORTES / DASHBOARD
// ═══════════════════════════════════════════════════════════════════

/** Dashboard KPIs (GET /reportes/dashboard) */
export interface DashboardData {
  ventasHoy: { total: number; cantidad: number; ticketPromedio: number };
  ventasMes: {
    total: number;
    cantidad: number;
    variacionVsMesAnterior: number;
  };
  cotizaciones: { pendientes: number; valorPendiente: number };
  devoluciones: {
    hoy: { total: number; cantidad: number };
    mes: { total: number; cantidad: number };
  };
  utilidad: {
    ingresos: number;
    costo: number;
    utilidadBruta: number;
    margenPorcentaje: number;
  };
  comprasMes: { total: number; cantidad: number };
  ordenesPendientesEntrega: number;
  productosStockBajo: number;
  sesionesActivas: number;
  turnosAbiertos: number;
  generadoEn: string;
}

/** Resumen de ventas (GET /reportes/ventas) */
export interface VentasResumen {
  periodo: { desde: string; hasta: string };
  totales: {
    ventasBrutas: number;
    descuentos: number;
    impuestos: number;
    cantidadOrdenes: number;
    ticketPromedio: number;
    ventaMaxima: number;
    ventaMinima: number;
  };
  utilidad: {
    ingresos: number;
    costo: number;
    utilidadBruta: number;
    margenPorcentaje: number;
  };
  cancelaciones: { total: number; cantidad: number };
  devoluciones: { total: number; cantidad: number };
  cotizaciones: { total: number; cantidad: number };
  ventasPorDia: Array<{ fecha: string; total: number; cantidad: number }>;
}

/** Top productos (GET /reportes/top-productos) */
export interface TopProductosReporte {
  periodo: { desde: string; hasta: string };
  porCantidad: TopProductoItem[];
  porIngresos: TopProductoItem[];
}

export interface TopProductoItem {
  productoId: string;
  nombre: string;
  sku: string;
  cantidadVendida: number;
  ingresos: number;
}

/** Métodos de pago (GET /reportes/metodos-pago) */
export interface MetodosPagoReporte {
  periodo: { desde: string; hasta: string };
  totalGeneral: number;
  desglose: Array<{
    metodo: string;
    total: number;
    cantidad: number;
    porcentaje: number;
  }>;
}

/** Inventario valorizado (GET /reportes/inventario) */
export interface InventarioValorizadoReporte {
  valorTotalGlobal: number;
  porAlmacen: Array<{
    almacenId: string;
    almacen: string;
    totalProductos: number;
    totalUnidades: number;
    valorTotal: number;
  }>;
  porCategoria: Array<{
    categoriaId: string;
    categoria: string;
    totalProductos: number;
    totalUnidades: number;
    valorTotal: number;
  }>;
  generadoEn: string;
}

/** Rendimiento de cajeros (GET /reportes/cajeros) */
export interface CajerosReporte {
  periodo: { desde: string; hasta: string };
  cajeros: Array<{
    usuarioId: string;
    nombre: string;
    rol: string;
    totalOrdenes: number;
    totalVendido: number;
    ticketPromedio: number;
    cancelaciones: number;
  }>;
}

/** Reporte de entregas (GET /reportes/entregas) */
export interface EntregasReporte {
  periodo: { desde: string; hasta: string };
  totalEntregas: number;
  tasaExitoGlobal: number;
  porEstado: Array<{ estado: string; cantidad: number }>;
  porRepartidor: Array<{
    repartidorId: string;
    nombre: string;
    entregadas: number;
    noEntregadas: number;
    tasaExito: number;
  }>;
}

/** Filtro de fechas reutilizable para reportes */
export interface FiltroFechas {
  fechaDesde: string;
  fechaHasta: string;
}
