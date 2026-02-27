/**
 * src/modulos/reportes/reportes.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de reportes.
 * Consultas de solo lectura optimizadas con aggregation de Prisma.
 *
 * Reportes implementados:
 * 1. Dashboard  - KPIs principales en tiempo real (ventas, cotizaciones,
 *                 devoluciones, utilidad, compras, inventario, entregas)
 * 2. Ventas     - Resumen por rango de fechas (totales, promedios, por dia)
 * 3. Top productos - Mas vendidos en cantidad y en ingresos
 * 4. Metodos de pago - Desglose por tipo de pago
 * 5. Inventario valorizado - Stock actual x costo unitario
 * 6. Cajeros    - Rendimiento por usuario (ordenes, total vendido)
 * 7. Entregas   - Estadisticas de delivery
 * ------------------------------------------------------------------
 */

import dayjs from 'dayjs';
import { prisma } from '../../config/database';
import { cache, CacheTTL } from '../../config/cache';
import type { FiltroFechasDto, TopProductosDto } from './reportes.schema';

const MODULO = 'REPORTES';

export const ReportesService = {

  // ================================================================
  // 1. DASHBOARD - KPIs en tiempo real
  // ================================================================

  /**
   * Retorna los indicadores clave del negocio:
   * - Ventas de hoy (total, cantidad, ticket promedio)
   * - Ventas del mes (con variacion vs mes anterior)
   * - Cotizaciones pendientes (cantidad y valor)
   * - Devoluciones de hoy y del mes
   * - Utilidad bruta (ingresos - costo, margen %)
   * - Compras del mes
   * - Ordenes pendientes de entrega
   * - Productos con stock bajo
   * - Sesiones activas y turnos abiertos
   */
  async dashboard(empresaId: string) {
    const cacheKey = `${MODULO}:dashboard:${empresaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const hoyInicio = dayjs().startOf('day').toDate();
    const hoyFin = dayjs().endOf('day').toDate();
    const mesInicio = dayjs().startOf('month').toDate();
    const mesFin = dayjs().endOf('month').toDate();
    const mesAnteriorInicio = dayjs().subtract(1, 'month').startOf('month').toDate();
    const mesAnteriorFin = dayjs().subtract(1, 'month').endOf('month').toDate();

    const [
      ventasHoy,
      ventasMes,
      ventasMesAnterior,
      ordenesPendientesEntrega,
      productosStockBajo,
      sesionesActivas,
      turnosAbiertos,
      cotizacionesPendientes,
      devolucionesHoy,
      devolucionesMes,
      utilidadMes,
      comprasMes,
    ] = await Promise.all([
      // Ventas de hoy
      prisma.orden.aggregate({
        where: {
          empresaId,
          estado: 'COMPLETADA',
          creadoEn: { gte: hoyInicio, lte: hoyFin },
        },
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true },
      }),

      // Ventas del mes
      prisma.orden.aggregate({
        where: {
          empresaId,
          estado: 'COMPLETADA',
          creadoEn: { gte: mesInicio, lte: mesFin },
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Ventas del mes anterior (para comparativa)
      prisma.orden.aggregate({
        where: {
          empresaId,
          estado: 'COMPLETADA',
          creadoEn: { gte: mesAnteriorInicio, lte: mesAnteriorFin },
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Ordenes completadas sin entrega asignada
      prisma.orden.count({
        where: {
          empresaId,
          estado: 'COMPLETADA',
          entrega: null,
        },
      }),

      // Productos con stock bajo (existencia <= stockMinimo)
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count
        FROM existencias e
        JOIN productos p ON p.id = e."productoId"
        WHERE p."empresaId" = ${empresaId}
          AND p.activo = true
          AND p."rastrearInventario" = true
          AND e.cantidad <= p."stockMinimo"
      `,

      // Sesiones activas
      prisma.sesion.count({
        where: {
          usuario: { empresaId },
          activo: true,
        },
      }),

      // Turnos de caja abiertos
      prisma.turnoCaja.count({
        where: {
          cajaRegistradora: { empresaId },
          cerradaEn: null,
        },
      }),

      // Cotizaciones pendientes de confirmar
      prisma.orden.aggregate({
        where: {
          empresaId,
          estado: 'COTIZACION',
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Devoluciones de hoy
      prisma.orden.aggregate({
        where: {
          empresaId,
          estado: 'DEVUELTA',
          actualizadoEn: { gte: hoyInicio, lte: hoyFin },
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Devoluciones del mes
      prisma.orden.aggregate({
        where: {
          empresaId,
          estado: 'DEVUELTA',
          actualizadoEn: { gte: mesInicio, lte: mesFin },
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Utilidad bruta del mes (ventas - costo)
      prisma.$queryRaw<[{ ingresos: number; costo: number; utilidad: number }]>`
        SELECT
          COALESCE(SUM(d.subtotal), 0)::float           AS ingresos,
          COALESCE(SUM(d."precioCosto" * d.cantidad), 0)::float AS costo,
          COALESCE(SUM(d.subtotal - d."precioCosto" * d.cantidad), 0)::float AS utilidad
        FROM detalles_orden d
        JOIN ordenes o ON o.id = d."ordenId"
        WHERE o."empresaId" = ${empresaId}
          AND o.estado = 'COMPLETADA'
          AND o."creadoEn" >= ${mesInicio}
          AND o."creadoEn" <= ${mesFin}
      `,

      // Compras del mes
      prisma.compra.aggregate({
        where: {
          empresaId,
          creadoEn: { gte: mesInicio, lte: mesFin },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    // Comparativa mensual
    const ventasMesActual = Number(ventasMes._sum.total ?? 0);
    const ventasMesPrevio = Number(ventasMesAnterior._sum.total ?? 0);
    const variacionMensual = ventasMesPrevio > 0
      ? Math.round(((ventasMesActual - ventasMesPrevio) / ventasMesPrevio) * 10000) / 100
      : 0;

    const util = utilidadMes[0] ?? { ingresos: 0, costo: 0, utilidad: 0 };
    const margenPorcentaje = util.ingresos > 0
      ? Math.round((util.utilidad / util.ingresos) * 10000) / 100
      : 0;

    const resultado = {
      ventasHoy: {
        total: Number(ventasHoy._sum.total ?? 0),
        cantidad: ventasHoy._count.id,
        ticketPromedio: Number(ventasHoy._avg.total ?? 0),
      },
      ventasMes: {
        total: ventasMesActual,
        cantidad: ventasMes._count.id,
        variacionVsMesAnterior: variacionMensual,
      },
      cotizaciones: {
        pendientes: cotizacionesPendientes._count.id,
        valorPendiente: Number(cotizacionesPendientes._sum.total ?? 0),
      },
      devoluciones: {
        hoy: {
          total: Number(devolucionesHoy._sum.total ?? 0),
          cantidad: devolucionesHoy._count.id,
        },
        mes: {
          total: Number(devolucionesMes._sum.total ?? 0),
          cantidad: devolucionesMes._count.id,
        },
      },
      utilidad: {
        ingresos: util.ingresos,
        costo: util.costo,
        utilidadBruta: util.utilidad,
        margenPorcentaje,
      },
      comprasMes: {
        total: Number(comprasMes._sum.total ?? 0),
        cantidad: comprasMes._count.id,
      },
      ordenesPendientesEntrega,
      productosStockBajo: Number(productosStockBajo[0]?.count ?? 0),
      sesionesActivas,
      turnosAbiertos,
      generadoEn: new Date().toISOString(),
    };

    cache.set(cacheKey, resultado, 60); // Cache 60s para dashboard
    return resultado;
  },

  // ================================================================
  // 2. REPORTE DE VENTAS
  // ================================================================

  /**
   * Resumen de ventas en un rango de fechas.
   * Incluye total, promedio, desglose por dia, comparativa,
   * devoluciones, cotizaciones y utilidad bruta.
   */
  async ventasResumen(filtros: FiltroFechasDto, empresaId: string) {
    const cacheKey = `${MODULO}:ventas:${empresaId}:${filtros.fechaDesde}:${filtros.fechaHasta}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const desde = new Date(`${filtros.fechaDesde}T00:00:00`);
    const hasta = new Date(`${filtros.fechaHasta}T23:59:59`);

    const [totales, cancelaciones, devoluciones, cotizaciones, utilidad, ventasPorDia] =
      await Promise.all([
        // Totales generales
        prisma.orden.aggregate({
          where: {
            empresaId,
            estado: 'COMPLETADA',
            creadoEn: { gte: desde, lte: hasta },
          },
          _sum: { total: true, montoDescuento: true, montoImpuesto: true },
          _count: { id: true },
          _avg: { total: true },
          _max: { total: true },
          _min: { total: true },
        }),

        // Cancelaciones en el periodo
        prisma.orden.aggregate({
          where: {
            empresaId,
            estado: 'CANCELADA',
            creadoEn: { gte: desde, lte: hasta },
          },
          _sum: { total: true },
          _count: { id: true },
        }),

        // Devoluciones en el periodo
        prisma.orden.aggregate({
          where: {
            empresaId,
            estado: 'DEVUELTA',
            actualizadoEn: { gte: desde, lte: hasta },
          },
          _sum: { total: true },
          _count: { id: true },
        }),

        // Cotizaciones creadas en el periodo
        prisma.orden.aggregate({
          where: {
            empresaId,
            estado: 'COTIZACION',
            creadoEn: { gte: desde, lte: hasta },
          },
          _sum: { total: true },
          _count: { id: true },
        }),

        // Utilidad bruta del periodo
        prisma.$queryRaw<[{ ingresos: number; costo: number; utilidad: number }]>`
          SELECT
            COALESCE(SUM(d.subtotal), 0)::float           AS ingresos,
            COALESCE(SUM(d."precioCosto" * d.cantidad), 0)::float AS costo,
            COALESCE(SUM(d.subtotal - d."precioCosto" * d.cantidad), 0)::float AS utilidad
          FROM detalles_orden d
          JOIN ordenes o ON o.id = d."ordenId"
          WHERE o."empresaId" = ${empresaId}
            AND o.estado = 'COMPLETADA'
            AND o."creadoEn" >= ${desde}
            AND o."creadoEn" <= ${hasta}
        `,

        // Ventas agrupadas por dia
        prisma.$queryRaw<
          Array<{ fecha: string; total: number; cantidad: number }>
        >`
          SELECT
            DATE("creadoEn")::text as fecha,
            SUM(total)::float as total,
            COUNT(*)::int as cantidad
          FROM ordenes
          WHERE "empresaId" = ${empresaId}
            AND estado = 'COMPLETADA'
            AND "creadoEn" >= ${desde}
            AND "creadoEn" <= ${hasta}
          GROUP BY DATE("creadoEn")
          ORDER BY fecha ASC
        `,
      ]);

    const util = utilidad[0] ?? { ingresos: 0, costo: 0, utilidad: 0 };
    const margen = util.ingresos > 0
      ? Math.round((util.utilidad / util.ingresos) * 10000) / 100
      : 0;

    const resultado = {
      periodo: { desde: filtros.fechaDesde, hasta: filtros.fechaHasta },
      totales: {
        ventasBrutas: Number(totales._sum.total ?? 0),
        descuentos: Number(totales._sum.montoDescuento ?? 0),
        impuestos: Number(totales._sum.montoImpuesto ?? 0),
        cantidadOrdenes: totales._count.id,
        ticketPromedio: Number(totales._avg.total ?? 0),
        ventaMaxima: Number(totales._max.total ?? 0),
        ventaMinima: Number(totales._min.total ?? 0),
      },
      utilidad: {
        ingresos: util.ingresos,
        costo: util.costo,
        utilidadBruta: util.utilidad,
        margenPorcentaje: margen,
      },
      cancelaciones: {
        total: Number(cancelaciones._sum.total ?? 0),
        cantidad: cancelaciones._count.id,
      },
      devoluciones: {
        total: Number(devoluciones._sum.total ?? 0),
        cantidad: devoluciones._count.id,
      },
      cotizaciones: {
        total: Number(cotizaciones._sum.total ?? 0),
        cantidad: cotizaciones._count.id,
      },
      ventasPorDia,
    };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS); // 120s
    return resultado;
  },

  // ================================================================
  // 3. TOP PRODUCTOS
  // ================================================================

  /**
   * Productos mas vendidos por cantidad y por ingresos.
   */
  async topProductos(filtros: TopProductosDto, empresaId: string) {
    const cacheKey = `${MODULO}:top:${empresaId}:${JSON.stringify(filtros)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const desde = new Date(`${filtros.fechaDesde}T00:00:00`);
    const hasta = new Date(`${filtros.fechaHasta}T23:59:59`);

    // Top por cantidad vendida
    const porCantidad = await prisma.$queryRaw<
      Array<{
        productoId: string;
        nombre: string;
        sku: string;
        cantidadVendida: number;
        ingresos: number;
      }>
    >`
      SELECT
        d."productoId",
        p.nombre,
        p.sku,
        SUM(d.cantidad)::float as "cantidadVendida",
        SUM(d.subtotal)::float as ingresos
      FROM detalles_orden d
      JOIN ordenes o ON o.id = d."ordenId"
      JOIN productos p ON p.id = d."productoId"
      WHERE o."empresaId" = ${empresaId}
        AND o.estado = 'COMPLETADA'
        AND o."creadoEn" >= ${desde}
        AND o."creadoEn" <= ${hasta}
      GROUP BY d."productoId", p.nombre, p.sku
      ORDER BY "cantidadVendida" DESC
      LIMIT ${filtros.limite}
    `;

    // Top por ingresos (puede diferir del anterior)
    const porIngresos = await prisma.$queryRaw<
      Array<{
        productoId: string;
        nombre: string;
        sku: string;
        cantidadVendida: number;
        ingresos: number;
      }>
    >`
      SELECT
        d."productoId",
        p.nombre,
        p.sku,
        SUM(d.cantidad)::float as "cantidadVendida",
        SUM(d.subtotal)::float as ingresos
      FROM detalles_orden d
      JOIN ordenes o ON o.id = d."ordenId"
      JOIN productos p ON p.id = d."productoId"
      WHERE o."empresaId" = ${empresaId}
        AND o.estado = 'COMPLETADA'
        AND o."creadoEn" >= ${desde}
        AND o."creadoEn" <= ${hasta}
      GROUP BY d."productoId", p.nombre, p.sku
      ORDER BY ingresos DESC
      LIMIT ${filtros.limite}
    `;

    const resultado = {
      periodo: { desde: filtros.fechaDesde, hasta: filtros.fechaHasta },
      porCantidad,
      porIngresos,
    };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  // ================================================================
  // 4. METODOS DE PAGO
  // ================================================================

  /**
   * Desglose de pagos por metodo en un periodo.
   */
  async metodosPago(filtros: FiltroFechasDto, empresaId: string) {
    const cacheKey = `${MODULO}:pagos:${empresaId}:${filtros.fechaDesde}:${filtros.fechaHasta}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const desde = new Date(`${filtros.fechaDesde}T00:00:00`);
    const hasta = new Date(`${filtros.fechaHasta}T23:59:59`);

    const desglose = await prisma.$queryRaw<
      Array<{ metodo: string; total: number; cantidad: number }>
    >`
      SELECT
        p.metodo,
        SUM(p.monto)::float as total,
        COUNT(*)::int as cantidad
      FROM pagos p
      JOIN ordenes o ON o.id = p."ordenId"
      WHERE o."empresaId" = ${empresaId}
        AND o.estado = 'COMPLETADA'
        AND o."creadoEn" >= ${desde}
        AND o."creadoEn" <= ${hasta}
      GROUP BY p.metodo
      ORDER BY total DESC
    `;

    const totalGeneral = desglose.reduce((sum, d) => sum + d.total, 0);

    const resultado = {
      periodo: { desde: filtros.fechaDesde, hasta: filtros.fechaHasta },
      totalGeneral,
      desglose: desglose.map((d) => ({
        ...d,
        porcentaje: totalGeneral > 0 ? Math.round((d.total / totalGeneral) * 10000) / 100 : 0,
      })),
    };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  // ================================================================
  // 5. INVENTARIO VALORIZADO
  // ================================================================

  /**
   * Valor total del inventario a costo actual.
   * Agrupado por almacen y categoria.
   */
  async inventarioValorizado(empresaId: string) {
    const cacheKey = `${MODULO}:inventario:${empresaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Por almacen
    const porAlmacen = await prisma.$queryRaw<
      Array<{
        almacenId: string;
        almacen: string;
        totalProductos: number;
        totalUnidades: number;
        valorTotal: number;
      }>
    >`
      SELECT
        a.id as "almacenId",
        a.nombre as almacen,
        COUNT(DISTINCT e."productoId")::int as "totalProductos",
        SUM(e.cantidad)::float as "totalUnidades",
        SUM(e.cantidad * p."precioCosto")::float as "valorTotal"
      FROM existencias e
      JOIN almacenes a ON a.id = e."almacenId"
      JOIN productos p ON p.id = e."productoId"
      WHERE p."empresaId" = ${empresaId}
        AND p.activo = true
      GROUP BY a.id, a.nombre
      ORDER BY "valorTotal" DESC
    `;

    // Por categoria
    const porCategoria = await prisma.$queryRaw<
      Array<{
        categoriaId: string;
        categoria: string;
        totalProductos: number;
        totalUnidades: number;
        valorTotal: number;
      }>
    >`
      SELECT
        c.id as "categoriaId",
        c.nombre as categoria,
        COUNT(DISTINCT e."productoId")::int as "totalProductos",
        SUM(e.cantidad)::float as "totalUnidades",
        SUM(e.cantidad * p."precioCosto")::float as "valorTotal"
      FROM existencias e
      JOIN productos p ON p.id = e."productoId"
      LEFT JOIN categorias c ON c.id = p."categoriaId"
      WHERE p."empresaId" = ${empresaId}
        AND p.activo = true
      GROUP BY c.id, c.nombre
      ORDER BY "valorTotal" DESC
    `;

    const valorTotalGlobal = porAlmacen.reduce((sum, a) => sum + (a.valorTotal ?? 0), 0);

    const resultado = {
      valorTotalGlobal,
      porAlmacen,
      porCategoria,
      generadoEn: new Date().toISOString(),
    };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  // ================================================================
  // 6. RENDIMIENTO DE CAJEROS
  // ================================================================

  /**
   * Estadisticas por cajero: ordenes, total vendido, ticket promedio.
   */
  async rendimientoCajeros(filtros: FiltroFechasDto, empresaId: string) {
    const cacheKey = `${MODULO}:cajeros:${empresaId}:${filtros.fechaDesde}:${filtros.fechaHasta}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const desde = new Date(`${filtros.fechaDesde}T00:00:00`);
    const hasta = new Date(`${filtros.fechaHasta}T23:59:59`);

    const rendimiento = await prisma.$queryRaw<
      Array<{
        usuarioId: string;
        nombre: string;
        rol: string;
        totalOrdenes: number;
        totalVendido: number;
        ticketPromedio: number;
        cancelaciones: number;
      }>
    >`
      SELECT
        u.id as "usuarioId",
        u.nombre,
        u.rol,
        COUNT(CASE WHEN o.estado = 'COMPLETADA' THEN 1 END)::int as "totalOrdenes",
        COALESCE(SUM(CASE WHEN o.estado = 'COMPLETADA' THEN o.total END), 0)::float as "totalVendido",
        COALESCE(AVG(CASE WHEN o.estado = 'COMPLETADA' THEN o.total END), 0)::float as "ticketPromedio",
        COUNT(CASE WHEN o.estado = 'CANCELADA' THEN 1 END)::int as cancelaciones
      FROM usuarios u
      LEFT JOIN ordenes o ON o."creadoPorId" = u.id
        AND o."creadoEn" >= ${desde}
        AND o."creadoEn" <= ${hasta}
      WHERE u."empresaId" = ${empresaId}
        AND u.rol IN ('ADMIN', 'CAJERO')
        AND u.activo = true
      GROUP BY u.id, u.nombre, u.rol
      ORDER BY "totalVendido" DESC
    `;

    const resultado = {
      periodo: { desde: filtros.fechaDesde, hasta: filtros.fechaHasta },
      cajeros: rendimiento,
    };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  // ================================================================
  // 7. REPORTE DE ENTREGAS
  // ================================================================

  /**
   * Estadisticas de entregas: completadas, fallidas, tiempo promedio.
   */
  async reporteEntregas(filtros: FiltroFechasDto, empresaId: string) {
    const cacheKey = `${MODULO}:entregas:${empresaId}:${filtros.fechaDesde}:${filtros.fechaHasta}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const desde = new Date(`${filtros.fechaDesde}T00:00:00`);
    const hasta = new Date(`${filtros.fechaHasta}T23:59:59`);

    // Totales por estado
    const porEstado = await prisma.$queryRaw<
      Array<{ estado: string; cantidad: number }>
    >`
      SELECT
        e.estado,
        COUNT(*)::int as cantidad
      FROM entregas e
      JOIN ordenes o ON o.id = e."ordenId"
      WHERE o."empresaId" = ${empresaId}
        AND e."creadoEn" >= ${desde}
        AND e."creadoEn" <= ${hasta}
      GROUP BY e.estado
      ORDER BY cantidad DESC
    `;

    // Rendimiento por repartidor
    const porRepartidor = await prisma.$queryRaw<
      Array<{
        repartidorId: string;
        nombre: string;
        entregadas: number;
        noEntregadas: number;
        tasaExito: number;
      }>
    >`
      SELECT
        u.id as "repartidorId",
        u.nombre,
        COUNT(CASE WHEN e.estado = 'ENTREGADO' THEN 1 END)::int as entregadas,
        COUNT(CASE WHEN e.estado = 'NO_ENTREGADO' THEN 1 END)::int as "noEntregadas",
        CASE
          WHEN COUNT(*) > 0
          THEN ROUND(
            COUNT(CASE WHEN e.estado = 'ENTREGADO' THEN 1 END)::numeric /
            NULLIF(COUNT(CASE WHEN e.estado IN ('ENTREGADO', 'NO_ENTREGADO') THEN 1 END), 0) * 100,
            1
          )::float
          ELSE 0
        END as "tasaExito"
      FROM entregas e
      JOIN ordenes o ON o.id = e."ordenId"
      LEFT JOIN usuarios u ON u.id = e."asignadoAId"
      WHERE o."empresaId" = ${empresaId}
        AND e."creadoEn" >= ${desde}
        AND e."creadoEn" <= ${hasta}
        AND e."asignadoAId" IS NOT NULL
      GROUP BY u.id, u.nombre
      ORDER BY entregadas DESC
    `;

    const totalEntregas = porEstado.reduce((sum, e) => sum + e.cantidad, 0);
    const entregadas = porEstado.find((e) => e.estado === 'ENTREGADO')?.cantidad ?? 0;

    const resultado = {
      periodo: { desde: filtros.fechaDesde, hasta: filtros.fechaHasta },
      totalEntregas,
      tasaExitoGlobal: totalEntregas > 0
        ? Math.round((entregadas / totalEntregas) * 10000) / 100
        : 0,
      porEstado,
      porRepartidor,
    };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },
};
