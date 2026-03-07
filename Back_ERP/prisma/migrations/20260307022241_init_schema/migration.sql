-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'CAJERO', 'REPARTIDOR');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('PIEZA', 'METRO', 'KILO', 'LITRO', 'AREA', 'CAJA', 'SERVICIO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA_VENTA', 'AJUSTE_MANUAL', 'DEVOLUCION', 'MERMA', 'TRASLADO');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('COTIZACION', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA', 'DEVUELTA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'CREDITO_CLIENTE', 'MIXTO');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'NO_ENTREGADO', 'REPROGRAMADO');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "logoUrl" TEXT,
    "tasaImpuesto" DECIMAL(65,30) NOT NULL DEFAULT 0.16,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'CAJERO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "telefono" TEXT,
    "avatarUrl" TEXT,
    "horarioInicio" TEXT,
    "horarioFin" TEXT,
    "diasLaborales" INTEGER[],
    "ultimoLoginEn" TIMESTAMP(3),
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "hashPin" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoPorId" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "direccionIp" TEXT,
    "agenteUsuario" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacenes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "padreId" TEXT,
    "colorHex" TEXT,
    "nombreIcono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "proveedorId" TEXT,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "tipoUnidad" "TipoUnidad" NOT NULL DEFAULT 'PIEZA',
    "etiquetaUnidad" TEXT NOT NULL DEFAULT 'pza',
    "conversionUnidad" DECIMAL(65,30),
    "cantidadMinimaVenta" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "incrementoVenta" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "precioCosto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "precioVenta1" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "precioVenta2" DECIMAL(65,30),
    "precioVenta3" DECIMAL(65,30),
    "impuestoIncluido" BOOLEAN NOT NULL DEFAULT true,
    "tasaImpuesto" DECIMAL(65,30) NOT NULL DEFAULT 0.16,
    "rastrearInventario" BOOLEAN NOT NULL DEFAULT true,
    "stockMinimo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stockMaximo" DECIMAL(65,30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "imagenUrl" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "existencias" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "existencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "almacenDestinoId" TEXT,
    "tipoMovimiento" "TipoMovimiento" NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "cantidadAnterior" DECIMAL(65,30) NOT NULL,
    "cantidadPosterior" DECIMAL(65,30) NOT NULL,
    "costoUnitario" DECIMAL(65,30),
    "motivo" TEXT,
    "referenciaId" TEXT,
    "referenciaTipo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT,
    "direccion" TEXT,
    "rfc" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "limiteCredito" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "creditoUtilizado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreContacto" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "direccion" TEXT,
    "rfc" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_registradoras" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_registradoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_caja" (
    "id" TEXT NOT NULL,
    "cajaRegistradoraId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "montoApertura" DECIMAL(65,30) NOT NULL,
    "montoCierre" DECIMAL(65,30),
    "montoEsperado" DECIMAL(65,30),
    "diferencia" DECIMAL(65,30),
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "notas" TEXT,

    CONSTRAINT "turnos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_trabajo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "diasLaborales" INTEGER[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnos_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numeroOrden" TEXT NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'PENDIENTE',
    "clienteId" TEXT,
    "cajaRegistradoraId" TEXT,
    "turnoCajaId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "aprobadoPorId" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montoImpuesto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montoDescuento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "montoPagado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cambio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "motivoCancelacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_orden" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "precioCosto" DECIMAL(65,30) NOT NULL,
    "descuento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tasaImpuesto" DECIMAL(65,30) NOT NULL DEFAULT 0.16,
    "subtotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "detalles_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "referencia" TEXT,
    "pagadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "clienteId" TEXT,
    "asignadoAId" TEXT,
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'ASIGNADO',
    "direccionEntrega" TEXT NOT NULL,
    "programadaEn" TIMESTAMP(3),
    "entregadaEn" TIMESTAMP(3),
    "notas" TEXT,
    "firmaUrl" TEXT,
    "fotoUrl" TEXT,
    "motivoFallo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "numeroCompra" TEXT NOT NULL,
    "numeroFactura" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montoImpuesto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "recibidaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_compra" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "costoUnitario" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "detalles_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "referenciaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "valoresAnteriores" JSONB,
    "valoresNuevos" JSONB,
    "direccionIp" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_rfc_key" ON "empresas"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE INDEX "usuarios_correo_idx" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_key" ON "sesiones"("token");

-- CreateIndex
CREATE INDEX "sesiones_usuarioId_idx" ON "sesiones"("usuarioId");

-- CreateIndex
CREATE INDEX "sesiones_token_idx" ON "sesiones"("token");

-- CreateIndex
CREATE INDEX "almacenes_empresaId_idx" ON "almacenes"("empresaId");

-- CreateIndex
CREATE INDEX "categorias_empresaId_idx" ON "categorias"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigoBarras_key" ON "productos"("codigoBarras");

-- CreateIndex
CREATE INDEX "productos_empresaId_idx" ON "productos"("empresaId");

-- CreateIndex
CREATE INDEX "productos_codigoBarras_idx" ON "productos"("codigoBarras");

-- CreateIndex
CREATE INDEX "productos_sku_idx" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_categoriaId_idx" ON "productos"("categoriaId");

-- CreateIndex
CREATE INDEX "existencias_productoId_idx" ON "existencias"("productoId");

-- CreateIndex
CREATE INDEX "existencias_almacenId_idx" ON "existencias"("almacenId");

-- CreateIndex
CREATE UNIQUE INDEX "existencias_productoId_almacenId_key" ON "existencias"("productoId", "almacenId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_productoId_idx" ON "movimientos_inventario"("productoId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_almacenId_idx" ON "movimientos_inventario"("almacenId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_creadoEn_idx" ON "movimientos_inventario"("creadoEn");

-- CreateIndex
CREATE INDEX "clientes_empresaId_idx" ON "clientes"("empresaId");

-- CreateIndex
CREATE INDEX "clientes_telefono_idx" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "proveedores_empresaId_idx" ON "proveedores"("empresaId");

-- CreateIndex
CREATE INDEX "turnos_caja_usuarioId_idx" ON "turnos_caja"("usuarioId");

-- CreateIndex
CREATE INDEX "turnos_caja_cajaRegistradoraId_idx" ON "turnos_caja"("cajaRegistradoraId");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_numeroOrden_key" ON "ordenes"("numeroOrden");

-- CreateIndex
CREATE INDEX "ordenes_empresaId_idx" ON "ordenes"("empresaId");

-- CreateIndex
CREATE INDEX "ordenes_clienteId_idx" ON "ordenes"("clienteId");

-- CreateIndex
CREATE INDEX "ordenes_creadoEn_idx" ON "ordenes"("creadoEn");

-- CreateIndex
CREATE INDEX "ordenes_estado_idx" ON "ordenes"("estado");

-- CreateIndex
CREATE INDEX "detalles_orden_ordenId_idx" ON "detalles_orden"("ordenId");

-- CreateIndex
CREATE INDEX "detalles_orden_productoId_idx" ON "detalles_orden"("productoId");

-- CreateIndex
CREATE INDEX "pagos_ordenId_idx" ON "pagos"("ordenId");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_ordenId_key" ON "entregas"("ordenId");

-- CreateIndex
CREATE INDEX "entregas_asignadoAId_idx" ON "entregas"("asignadoAId");

-- CreateIndex
CREATE INDEX "entregas_estado_idx" ON "entregas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "compras_numeroCompra_key" ON "compras"("numeroCompra");

-- CreateIndex
CREATE INDEX "compras_empresaId_idx" ON "compras"("empresaId");

-- CreateIndex
CREATE INDEX "compras_proveedorId_idx" ON "compras"("proveedorId");

-- CreateIndex
CREATE INDEX "detalles_compra_compraId_idx" ON "detalles_compra"("compraId");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_idx" ON "notificaciones"("usuarioId");

-- CreateIndex
CREATE INDEX "notificaciones_leido_idx" ON "notificaciones"("leido");

-- CreateIndex
CREATE INDEX "registros_auditoria_empresaId_idx" ON "registros_auditoria"("empresaId");

-- CreateIndex
CREATE INDEX "registros_auditoria_usuarioId_idx" ON "registros_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "registros_auditoria_entidad_entidadId_idx" ON "registros_auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "registros_auditoria_creadoEn_idx" ON "registros_auditoria"("creadoEn");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias" ADD CONSTRAINT "existencias_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias" ADD CONSTRAINT "existencias_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacenDestinoId_fkey" FOREIGN KEY ("almacenDestinoId") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_registradoras" ADD CONSTRAINT "cajas_registradoras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caja" ADD CONSTRAINT "turnos_caja_cajaRegistradoraId_fkey" FOREIGN KEY ("cajaRegistradoraId") REFERENCES "cajas_registradoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caja" ADD CONSTRAINT "turnos_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_trabajo" ADD CONSTRAINT "turnos_trabajo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_cajaRegistradoraId_fkey" FOREIGN KEY ("cajaRegistradoraId") REFERENCES "cajas_registradoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_turnoCajaId_fkey" FOREIGN KEY ("turnoCajaId") REFERENCES "turnos_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_orden" ADD CONSTRAINT "detalles_orden_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_orden" ADD CONSTRAINT "detalles_orden_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
