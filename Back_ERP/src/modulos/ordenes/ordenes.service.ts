/**
 * src/modulos/ordenes/ordenes.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de ordenes / ventas / cotizaciones POS.
 * Modulo mas critico del sistema. Todo usa transacciones atomicas.
 *
 * Reglas de negocio:
 * - Toda venta descuenta inventario automaticamente
 * - El numero de orden se genera secuencialmente (VTA-2026-00001)
 * - Las cotizaciones usan prefijo COT-2026-00001
 * - Pagos mixtos soportados (efectivo + tarjeta, etc.)
 * - Credito de cliente se valida contra limite disponible
 * - Solo ADMIN puede cancelar ordenes (retorna stock)
 * - Se requiere turno de caja abierto para crear ordenes (no cotizaciones)
 * - Las cotizaciones no descuentan stock hasta ser confirmadas
 * - Las devoluciones reingresan stock al inventario
 * ------------------------------------------------------------------
 */

import { EstadoOrden, MetodoPago, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { prisma } from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo } from '../../config/cache';
import { paginar, construirMeta } from '../../compartido/paginacion';
import {
  ErrorNoEncontrado,
  ErrorNegocio,
  ErrorPeticion,
} from '../../compartido/errores';
import { logger } from '../../compartido/logger';
import { registrarAuditoria } from '../../compartido/auditoria';
import type {
  CrearOrdenDto,
  CrearCotizacionDto,
  ConfirmarCotizacionDto,
  CancelarOrdenDto,
  DevolucionDto,
  FiltroOrdenesDto,
} from './ordenes.schema';

const MODULO = 'ORDENES';
const METODO_CREDITO_CLIENTE = MetodoPago.CREDITO_CLIENTE;

type PagoConMetodo = {
  metodo: MetodoPago;
  monto: number | Prisma.Decimal;
};

type OrdenNumeracionRepo = {
  findFirst: (args: Prisma.OrdenFindFirstArgs) => Promise<{ numeroOrden: string } | null>;
};

function calcularTotalPagos(pagos: PagoConMetodo[]): number {
  return pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
}

function calcularMontoCredito(pagos: PagoConMetodo[]): number {
  return pagos
    .filter((pago) => pago.metodo === METODO_CREDITO_CLIENTE)
    .reduce((sum, pago) => sum + Number(pago.monto), 0);
}

function obtenerMetodoPagoPrincipal(pagos: PagoConMetodo[]): MetodoPago {
  return pagos.length === 1 ? pagos[0].metodo : MetodoPago.MIXTO;
}

function calcularCambio(totalPagos: number, total: number): number {
  return totalPagos > total ? totalPagos - total : 0;
}

function validarMontoPagado(totalPagos: number, total: number): void {
  if (totalPagos < total) {
    throw new ErrorNegocio(
      `Monto pagado ($${totalPagos.toFixed(2)}) es menor al total ($${total.toFixed(2)})`,
    );
  }
}

function obtenerSiguienteSecuencial(numeroOrden: string): number {
  const partes = numeroOrden.split('-');
  const secuencialActual = parseInt(partes[2] ?? '', 10);
  return Number.isNaN(secuencialActual) ? 1 : secuencialActual + 1;
}

async function generarNumeroDocumento(
  ordenRepo: OrdenNumeracionRepo,
  empresaId: string,
  prefijo: 'VTA' | 'COT',
): Promise<string> {
  const anio = dayjs().format('YYYY');
  const ultimaOrden = await ordenRepo.findFirst({
    where: {
      empresaId,
      numeroOrden: { startsWith: `${prefijo}-${anio}-` },
    },
    orderBy: { creadoEn: 'desc' },
    select: { numeroOrden: true },
  });

  const siguiente = ultimaOrden ? obtenerSiguienteSecuencial(ultimaOrden.numeroOrden) : 1;
  return `${prefijo}-${anio}-${String(siguiente).padStart(5, '0')}`;
}

async function validarCreditoClienteDisponible(
  empresaId: string,
  clienteId: string | null | undefined,
  montoCredito: number,
): Promise<void> {
  if (montoCredito <= 0) return;

  if (!clienteId) {
    throw new ErrorPeticion('Se requiere un cliente para pago a credito');
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId, activo: true },
  });

  if (!cliente) {
    throw new ErrorNoEncontrado('Cliente no encontrado');
  }

  const creditoDisponible = Number(cliente.limiteCredito) - Number(cliente.creditoUtilizado);
  if (montoCredito > creditoDisponible) {
    throw new ErrorNegocio(
      `Credito insuficiente. Disponible: $${creditoDisponible.toFixed(2)}, Solicitado: $${montoCredito.toFixed(2)}`,
    );
  }
}

export const OrdenesService = {

  /**
   * Crea una orden de venta completa en una transaccion atomica.
   *
   * Flujo:
   * 1. Verificar turno de caja abierto
   * 2. Validar productos y stock disponible
   * 3. Validar credito del cliente (si aplica)
   * 4. Generar numero de orden secuencial
   * 5. Crear orden + detalles + pagos
   * 6. Descontar inventario (MovimientoInventario)
   * 7. Actualizar credito del cliente (si aplica)
   */
  async crear(dto: CrearOrdenDto, usuarioId: string, empresaId: string) {
    // 1. Verificar turno de caja abierto
    const turnoActivo = await prisma.turnoCaja.findFirst({
      where: { usuarioId, cerradaEn: null },
      include: { cajaRegistradora: true },
    });

    if (!turnoActivo) {
      throw new ErrorNegocio('Debes abrir un turno de caja antes de crear ordenes');
    }

    // 2. Validar productos y calcular totales
    const productosIds = dto.detalles.map((d) => d.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds }, empresaId, activo: true },
      include: {
        existencias: {
          where: {
            almacen: { esPrincipal: true, empresaId },
          },
        },
      },
    });

    if (productos.length !== productosIds.length) {
      throw new ErrorPeticion('Uno o mas productos no existen o estan inactivos');
    }

    // Mapear productos para acceso rapido
    const productoMap = new Map(productos.map((p) => [p.id, p]));

    // Calcular totales y verificar stock (pre-validacion; stock se re-verifica en transaccion)
    let subtotal = 0;
    let montoImpuesto = 0;
    let montoDescuento = 0;
    let totalOrden = 0;

    const detallesCalculados = dto.detalles.map((item) => {
      const producto = productoMap.get(item.productoId)!;

      // Pre-verificar stock (se re-verifica dentro de la transaccion)
      if (producto.rastrearInventario) {
        const existencia = producto.existencias[0];
        const stockDisponible = existencia ? Number(existencia.cantidad) : 0;

        if (stockDisponible < item.cantidad) {
          throw new ErrorNegocio(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}`,
          );
        }
      }

      const itemSubtotal = item.precioUnitario * item.cantidad;
      const itemDescuento = item.descuento * item.cantidad;
      const baseImponible = itemSubtotal - itemDescuento;
      const impuesto = producto.impuestoIncluido
        ? baseImponible - baseImponible / (1 + Number(producto.tasaImpuesto))
        : baseImponible * Number(producto.tasaImpuesto);

      subtotal += itemSubtotal;
      montoDescuento += itemDescuento;
      montoImpuesto += impuesto;

      // Total por item: si impuesto incluido, la base ya lo contiene; si no, se suma
      const itemTotal = producto.impuestoIncluido ? baseImponible : baseImponible + impuesto;
      totalOrden += itemTotal;

      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioCosto: Number(producto.precioCosto),
        descuento: item.descuento,
        tasaImpuesto: Number(producto.tasaImpuesto),
        subtotal: itemSubtotal - itemDescuento,
      };
    });

    const total = totalOrden;

    // 3. Validar pagos (cash + credito debe cubrir el total)
    const totalPagos = calcularTotalPagos(dto.pagos);
    const montoCredito = calcularMontoCredito(dto.pagos);

    validarMontoPagado(totalPagos, total);

    // 4. Validar credito del cliente si se usa
    await validarCreditoClienteDisponible(empresaId, dto.clienteId, montoCredito);

    // Determinar metodo de pago principal
    const metodoPago = obtenerMetodoPagoPrincipal(dto.pagos);

    // Calcular cambio (solo aplica a efectivo)
    const cambio = calcularCambio(totalPagos, total);

    // 6. Transaccion atomica: generar numero + verificar stock + crear orden + descontar stock + credito
    const orden = await prisma.$transaction(async (tx) => {
      // 6a. Generar numero de orden secuencial (DENTRO de la transaccion para evitar race condition)
      const numeroOrden = await generarNumeroDocumento(tx.orden, empresaId, 'VTA');

      // 6b. Re-verificar stock dentro de la transaccion (evita race condition)
      for (const detalle of detallesCalculados) {
        const producto = productoMap.get(detalle.productoId)!;
        if (!producto.rastrearInventario) continue;

        const existenciaActual = await tx.existencia.findFirst({
          where: {
            productoId: detalle.productoId,
            almacen: { esPrincipal: true, empresaId },
          },
        });

        const stockActual = existenciaActual ? Number(existenciaActual.cantidad) : 0;
        if (stockActual < detalle.cantidad) {
          throw new ErrorNegocio(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${stockActual}, Solicitado: ${detalle.cantidad}`,
          );
        }
      }

      // Crear la orden
      const nuevaOrden = await tx.orden.create({
        data: {
          empresaId,
          numeroOrden,
          estado: 'COMPLETADA',
          clienteId: dto.clienteId ?? null,
          cajaRegistradoraId: turnoActivo.cajaRegistradoraId,
          turnoCajaId: turnoActivo.id,
          creadoPorId: usuarioId,
          subtotal,
          montoImpuesto,
          montoDescuento,
          total,
          metodoPago,
          montoPagado: totalPagos,
          cambio,
          pagado: true,
          notas: dto.notas ?? null,
        },
      });

      // Crear detalles de la orden
      await tx.detalleOrden.createMany({
        data: detallesCalculados.map((d) => ({
          ordenId: nuevaOrden.id,
          ...d,
        })),
      });

      // Registrar pagos
      await tx.pago.createMany({
        data: dto.pagos.map((p) => ({
          ordenId: nuevaOrden.id,
          metodo: p.metodo,
          monto: p.monto,
          referencia: p.referencia ?? null,
        })),
      });

      // Descontar inventario por cada producto (usando datos frescos de la tx)
      for (const detalle of detallesCalculados) {
        const producto = productoMap.get(detalle.productoId)!;

        if (!producto.rastrearInventario) continue;

        // Leer existencia fresca dentro de la transaccion
        const existencia = await tx.existencia.findFirst({
          where: {
            productoId: detalle.productoId,
            almacen: { esPrincipal: true, empresaId },
          },
        });
        if (!existencia) continue;

        const cantidadAnterior = Number(existencia.cantidad);
        const cantidadPosterior = cantidadAnterior - detalle.cantidad;

        // Actualizar existencia
        await tx.existencia.update({
          where: { id: existencia.id },
          data: { cantidad: cantidadPosterior },
        });

        // Registrar movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: detalle.productoId,
            almacenId: existencia.almacenId,
            tipoMovimiento: 'SALIDA_VENTA',
            cantidad: detalle.cantidad,
            cantidadAnterior,
            cantidadPosterior,
            costoUnitario: detalle.precioCosto,
            referenciaId: nuevaOrden.id,
            referenciaTipo: 'ORDEN',
            usuarioId,
          },
        });
      }

      // Actualizar credito del cliente si aplica
      if (montoCredito > 0 && dto.clienteId) {
        await tx.cliente.update({
          where: { id: dto.clienteId },
          data: {
            creditoUtilizado: {
              increment: montoCredito,
            },
          },
        });
      }

      await registrarAuditoria(tx.registroAuditoria, {
        empresaId,
        usuarioId,
        accion: 'CREAR_ORDEN',
        entidad: 'ORDEN',
        entidadId: nuevaOrden.id,
        valoresNuevos: {
          numeroOrden,
          estado: 'COMPLETADA',
          total,
          montoPagado: totalPagos,
          metodoPago,
          items: detallesCalculados.map((detalle) => ({
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            subtotal: detalle.subtotal,
          })),
        },
      });

      // Retornar orden con relaciones
      return tx.orden.findUnique({
        where: { id: nuevaOrden.id },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, nombre: true, sku: true } },
            },
          },
          pagos: true,
          cliente: { select: { id: true, nombre: true } },
          creadoPor: { select: { id: true, nombre: true } },
        },
      });
    });

    invalidarCacheModulo(MODULO);
    invalidarCacheModulo('INVENTARIO');

    logger.info({
      mensaje: 'Orden creada',
      ordenId: orden?.id,
      numeroOrden: orden?.numeroOrden,
      total,
      items: dto.detalles.length,
      usuarioId,
    });

    return orden;
  },

  /**
   * Cancela una orden existente. Solo ADMIN.
   * Devuelve el stock al inventario y libera credito del cliente.
   */
  async cancelar(ordenId: string, dto: CancelarOrdenDto, usuarioId: string, empresaId: string) {
    const orden = await prisma.orden.findFirst({
      where: { id: ordenId, empresaId },
      include: {
        detalles: {
          include: {
            producto: {
              include: {
                existencias: {
                  where: { almacen: { esPrincipal: true } },
                },
              },
            },
          },
        },
        pagos: true,
      },
    });

    if (!orden) {
      throw new ErrorNoEncontrado('Orden no encontrada');
    }

    if (orden.estado === 'CANCELADA') {
      throw new ErrorNegocio('La orden ya esta cancelada');
    }

    if (orden.estado === 'DEVUELTA') {
      throw new ErrorNegocio('No se puede cancelar una orden devuelta');
    }

    // Transaccion: cancelar orden + devolver stock + liberar credito
    const ordenCancelada = await prisma.$transaction(async (tx) => {
      // Actualizar estado de la orden
      const actualizada = await tx.orden.update({
        where: { id: ordenId },
        data: {
          estado: 'CANCELADA',
          motivoCancelacion: dto.motivoCancelacion,
          aprobadoPorId: usuarioId,
        },
      });

      // Devolver stock por cada detalle
      for (const detalle of orden.detalles) {
        if (!detalle.producto.rastrearInventario) continue;

        const existencia = detalle.producto.existencias[0];
        if (!existencia) continue;

        const cantidadAnterior = Number(existencia.cantidad);
        const cantidadPosterior = cantidadAnterior + Number(detalle.cantidad);

        await tx.existencia.update({
          where: { id: existencia.id },
          data: { cantidad: cantidadPosterior },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: detalle.productoId,
            almacenId: existencia.almacenId,
            tipoMovimiento: 'DEVOLUCION',
            cantidad: Number(detalle.cantidad),
            cantidadAnterior,
            cantidadPosterior,
            costoUnitario: Number(detalle.precioCosto),
            referenciaId: ordenId,
            referenciaTipo: 'CANCELACION_ORDEN',
            usuarioId,
          },
        });
      }

      // Liberar credito del cliente si se uso
      if (orden.clienteId) {
        const montoCredito = calcularMontoCredito(orden.pagos);

        if (montoCredito > 0) {
          await tx.cliente.update({
            where: { id: orden.clienteId },
            data: {
              creditoUtilizado: { decrement: montoCredito },
            },
          });
        }
      }

      await registrarAuditoria(tx.registroAuditoria, {
        empresaId,
        usuarioId,
        accion: 'CANCELAR_ORDEN',
        entidad: 'ORDEN',
        entidadId: ordenId,
        valoresAnteriores: {
          estado: orden.estado,
          total: Number(orden.total),
        },
        valoresNuevos: {
          estado: 'CANCELADA',
          motivoCancelacion: dto.motivoCancelacion,
        },
      });

      return actualizada;
    });

    invalidarCacheModulo(MODULO);
    invalidarCacheModulo('INVENTARIO');

    logger.info({
      mensaje: 'Orden cancelada',
      ordenId,
      motivo: dto.motivoCancelacion,
      usuarioId,
    });

    return ordenCancelada;
  },

  /**
   * Obtiene una orden por ID con todos sus detalles.
   */
  async obtenerPorId(ordenId: string, empresaId: string) {
    const orden = await prisma.orden.findFirst({
      where: { id: ordenId, empresaId },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true, imagenUrl: true } },
          },
        },
        pagos: true,
        cliente: { select: { id: true, nombre: true, telefono: true } },
        creadoPor: { select: { id: true, nombre: true } },
        cajaRegistradora: { select: { id: true, nombre: true } },
        entrega: true,
      },
    });

    if (!orden) {
      throw new ErrorNoEncontrado('Orden no encontrada');
    }

    return orden;
  },

  /**
   * Lista ordenes con filtros y paginacion.
   */
  async listar(filtros: FiltroOrdenesDto, empresaId: string) {
    const cacheKey = `${MODULO}:listar:${empresaId}:${JSON.stringify(filtros)}`;
    const cached = cache.get<{ datos: unknown; meta: unknown }>(cacheKey);
    if (cached) return cached;

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };

    const where: Prisma.OrdenWhereInput = { empresaId };

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    if (filtros.clienteId) {
      where.clienteId = filtros.clienteId;
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      const creadoEn: Prisma.DateTimeFilter = {};
      if (filtros.fechaDesde) {
        creadoEn.gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        creadoEn.lte = new Date(filtros.fechaHasta);
      }
      where.creadoEn = creadoEn;
    }

    if (filtros.buscar) {
      where.OR = [
        { numeroOrden: { contains: filtros.buscar, mode: 'insensitive' } },
        { cliente: { nombre: { contains: filtros.buscar, mode: 'insensitive' } } },
      ];
    }

    const [datos, total] = await Promise.all([
      prisma.orden.findMany({
        where,
        ...paginar(parametros),
        orderBy: { creadoEn: 'desc' },
        include: {
          cliente: { select: { id: true, nombre: true } },
          creadoPor: { select: { id: true, nombre: true } },
          _count: { select: { detalles: true } },
        },
      }),
      prisma.orden.count({ where }),
    ]);

    const meta = construirMeta(total, parametros);
    const resultado = { datos, meta };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS); // 120s
    return resultado;
  },

  // ================================================================
  // COTIZACIONES
  // ================================================================

  /**
   * Crea una cotizacion (presupuesto).
   * NO descuenta stock, NO requiere turno de caja, NO registra pagos.
   * El cliente puede revisarla y confirmarla despues.
   */
  async crearCotizacion(dto: CrearCotizacionDto, usuarioId: string, empresaId: string) {
    // Validar productos y calcular totales
    const productosIds = dto.detalles.map((d) => d.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds }, empresaId, activo: true },
    });

    if (productos.length !== productosIds.length) {
      throw new ErrorPeticion('Uno o mas productos no existen o estan inactivos');
    }

    const productoMap = new Map(productos.map((p) => [p.id, p]));

    let subtotal = 0;
    let montoImpuesto = 0;
    let montoDescuento = 0;

    const detallesCalculados = dto.detalles.map((item) => {
      const producto = productoMap.get(item.productoId)!;
      const itemSubtotal = item.precioUnitario * item.cantidad;
      const itemDescuento = item.descuento * item.cantidad;
      const baseImponible = itemSubtotal - itemDescuento;
      const impuesto = producto.impuestoIncluido
        ? baseImponible - baseImponible / (1 + Number(producto.tasaImpuesto))
        : baseImponible * Number(producto.tasaImpuesto);

      subtotal += itemSubtotal;
      montoDescuento += itemDescuento;
      montoImpuesto += impuesto;

      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioCosto: Number(producto.precioCosto),
        descuento: item.descuento,
        tasaImpuesto: Number(producto.tasaImpuesto),
        subtotal: itemSubtotal - itemDescuento,
      };
    });

    const total = subtotal - montoDescuento + (productos[0]?.impuestoIncluido ? 0 : montoImpuesto);

    // Generar numero de cotizacion secuencial
    const numeroCotizacion = await generarNumeroDocumento(prisma.orden, empresaId, 'COT');

    const cotizacion = await prisma.orden.create({
      data: {
        empresaId,
        numeroOrden: numeroCotizacion,
        estado: 'COTIZACION',
        clienteId: dto.clienteId ?? null,
        creadoPorId: usuarioId,
        subtotal,
        montoImpuesto,
        montoDescuento,
        total,
        notas: dto.notas ?? null,
        detalles: {
          createMany: {
            data: detallesCalculados,
          },
        },
      },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
        },
        cliente: { select: { id: true, nombre: true } },
        creadoPor: { select: { id: true, nombre: true } },
      },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Cotizacion creada',
      ordenId: cotizacion.id,
      numeroCotizacion,
      total,
      items: dto.detalles.length,
      usuarioId,
    });

    return cotizacion;
  },

  /**
   * Confirma una cotizacion: la convierte en venta COMPLETADA.
   * En este momento se valida stock, se descuenta inventario y se registran pagos.
   * Requiere turno de caja abierto.
   */
  async confirmarCotizacion(
    cotizacionId: string,
    dto: ConfirmarCotizacionDto,
    usuarioId: string,
    empresaId: string,
  ) {
    // Verificar turno de caja abierto
    const turnoActivo = await prisma.turnoCaja.findFirst({
      where: { usuarioId, cerradaEn: null },
    });

    if (!turnoActivo) {
      throw new ErrorNegocio('Debes abrir un turno de caja para confirmar la cotizacion');
    }

    const cotizacion = await prisma.orden.findFirst({
      where: { id: cotizacionId, empresaId },
      include: {
        detalles: {
          include: {
            producto: {
              include: {
                existencias: {
                  where: { almacen: { esPrincipal: true, empresaId } },
                },
              },
            },
          },
        },
      },
    });

    if (!cotizacion) {
      throw new ErrorNoEncontrado('Cotizacion no encontrada');
    }

    if (cotizacion.estado !== 'COTIZACION') {
      throw new ErrorNegocio(`No se puede confirmar una orden con estado ${cotizacion.estado}`);
    }

    // Validar stock disponible para todos los productos
    for (const detalle of cotizacion.detalles) {
      if (!detalle.producto.rastrearInventario) continue;
      const existencia = detalle.producto.existencias[0];
      const stockDisponible = existencia ? Number(existencia.cantidad) : 0;

      if (stockDisponible < Number(detalle.cantidad)) {
        throw new ErrorNegocio(
          `Stock insuficiente para "${detalle.producto.nombre}". Disponible: ${stockDisponible}, Requerido: ${Number(detalle.cantidad)}`,
        );
      }
    }

    const total = Number(cotizacion.total);

    // Validar pagos
    const totalPagos = calcularTotalPagos(dto.pagos);
    const montoCredito = calcularMontoCredito(dto.pagos);
    const usaCredito = montoCredito > 0;

    if (!usaCredito) {
      validarMontoPagado(totalPagos, total);
    }

    // Validar credito del cliente si aplica
    if (usaCredito) {
      await validarCreditoClienteDisponible(empresaId, cotizacion.clienteId, montoCredito);
    }

    const metodoPago = obtenerMetodoPagoPrincipal(dto.pagos);
    const cambio = calcularCambio(totalPagos, total);

    // Transaccion atomica: confirmar cotizacion + descontar stock + registrar pagos
    const ordenConfirmada = await prisma.$transaction(async (tx) => {
      // Actualizar estado y datos de pago
      await tx.orden.update({
        where: { id: cotizacionId },
        data: {
          estado: 'COMPLETADA',
          cajaRegistradoraId: turnoActivo.cajaRegistradoraId,
          turnoCajaId: turnoActivo.id,
          metodoPago,
          montoPagado: totalPagos,
          cambio,
          pagado: true,
        },
      });

      // Registrar pagos
      await tx.pago.createMany({
        data: dto.pagos.map((p) => ({
          ordenId: cotizacionId,
          metodo: p.metodo,
          monto: p.monto,
          referencia: p.referencia ?? null,
        })),
      });

      // Descontar inventario
      for (const detalle of cotizacion.detalles) {
        if (!detalle.producto.rastrearInventario) continue;
        const existencia = detalle.producto.existencias[0];
        if (!existencia) continue;

        const cantidadAnterior = Number(existencia.cantidad);
        const cantidadPosterior = cantidadAnterior - Number(detalle.cantidad);

        await tx.existencia.update({
          where: { id: existencia.id },
          data: { cantidad: cantidadPosterior },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: detalle.productoId,
            almacenId: existencia.almacenId,
            tipoMovimiento: 'SALIDA_VENTA',
            cantidad: Number(detalle.cantidad),
            cantidadAnterior,
            cantidadPosterior,
            costoUnitario: Number(detalle.precioCosto),
            referenciaId: cotizacionId,
            referenciaTipo: 'COTIZACION_CONFIRMADA',
            usuarioId,
          },
        });
      }

      // Actualizar credito del cliente si aplica
      if (montoCredito > 0 && cotizacion.clienteId) {
        await tx.cliente.update({
          where: { id: cotizacion.clienteId },
          data: { creditoUtilizado: { increment: montoCredito } },
        });
      }

      await registrarAuditoria(tx.registroAuditoria, {
        empresaId,
        usuarioId,
        accion: 'CONFIRMAR_COTIZACION',
        entidad: 'ORDEN',
        entidadId: cotizacionId,
        valoresAnteriores: {
          estado: 'COTIZACION',
          total,
        },
        valoresNuevos: {
          estado: 'COMPLETADA',
          metodoPago,
          montoPagado: totalPagos,
        },
      });

      return tx.orden.findUnique({
        where: { id: cotizacionId },
        include: {
          detalles: {
            include: {
              producto: { select: { id: true, nombre: true, sku: true } },
            },
          },
          pagos: true,
          cliente: { select: { id: true, nombre: true } },
          creadoPor: { select: { id: true, nombre: true } },
        },
      });
    });

    invalidarCacheModulo(MODULO);
    invalidarCacheModulo('INVENTARIO');

    logger.info({
      mensaje: 'Cotizacion confirmada como venta',
      ordenId: cotizacionId,
      total,
      usuarioId,
    });

    return ordenConfirmada;
  },

  // ================================================================
  // DEVOLUCIONES
  // ================================================================

  /**
   * Procesa una devolucion total o parcial.
   * - Reingresa stock al inventario
   * - Libera credito del cliente si aplica
   * - Marca la orden como DEVUELTA si es total, mantiene COMPLETADA si es parcial
   */
  async devolver(
    ordenId: string,
    dto: DevolucionDto,
    usuarioId: string,
    empresaId: string,
  ) {
    const orden = await prisma.orden.findFirst({
      where: { id: ordenId, empresaId },
      include: {
        detalles: {
          include: {
            producto: {
              include: {
                existencias: {
                  where: { almacen: { esPrincipal: true } },
                },
              },
            },
          },
        },
        pagos: true,
      },
    });

    if (!orden) {
      throw new ErrorNoEncontrado('Orden no encontrada');
    }

    if (orden.estado !== 'COMPLETADA') {
      throw new ErrorNegocio('Solo se pueden devolver ordenes con estado COMPLETADA');
    }

    // Validar que los items de devolucion corresponden a la orden
    const detalleMap = new Map(
      orden.detalles.map((d) => [d.productoId, d]),
    );

    let montoDevolucion = 0;
    const itemsValidados = dto.items.map((item) => {
      const detalle = detalleMap.get(item.productoId);
      if (!detalle) {
        throw new ErrorPeticion(
          `El producto ${item.productoId} no pertenece a esta orden`,
        );
      }

      if (item.cantidad > Number(detalle.cantidad)) {
        throw new ErrorNegocio(
          `No se pueden devolver ${item.cantidad} unidades de "${detalle.producto.nombre}". Vendidas: ${Number(detalle.cantidad)}`,
        );
      }

      const proporcion = item.cantidad / Number(detalle.cantidad);
      const montoItem = Number(detalle.subtotal) * proporcion;
      montoDevolucion += montoItem;

      return {
        ...item,
        detalle,
        montoItem,
      };
    });

    // Determinar si es devolucion total o parcial
    const esTotal = dto.items.length === orden.detalles.length &&
      dto.items.every((item) => {
        const detalle = detalleMap.get(item.productoId);
        return detalle && item.cantidad === Number(detalle.cantidad);
      });

    // Transaccion atomica: devolver stock + actualizar orden + liberar credito
    const resultado = await prisma.$transaction(async (tx) => {
      // Reingresar stock por cada item devuelto
      for (const item of itemsValidados) {
        if (!item.detalle.producto.rastrearInventario) continue;
        const existencia = item.detalle.producto.existencias[0];
        if (!existencia) continue;

        const cantidadAnterior = Number(existencia.cantidad);
        const cantidadPosterior = cantidadAnterior + item.cantidad;

        await tx.existencia.update({
          where: { id: existencia.id },
          data: { cantidad: cantidadPosterior },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            almacenId: existencia.almacenId,
            tipoMovimiento: 'DEVOLUCION',
            cantidad: item.cantidad,
            cantidadAnterior,
            cantidadPosterior,
            costoUnitario: Number(item.detalle.precioCosto),
            referenciaId: ordenId,
            referenciaTipo: esTotal ? 'DEVOLUCION_TOTAL' : 'DEVOLUCION_PARCIAL',
            motivo: item.motivo ?? dto.motivo,
            usuarioId,
          },
        });
      }

      // Actualizar estado de la orden
      const nuevoEstado: EstadoOrden = esTotal ? EstadoOrden.DEVUELTA : EstadoOrden.COMPLETADA;
      const ordenActualizada = await tx.orden.update({
        where: { id: ordenId },
        data: {
          estado: nuevoEstado,
          notas: esTotal
            ? `${orden.notas ?? ''}\n[DEVOLUCION TOTAL] ${dto.motivo}`.trim()
            : `${orden.notas ?? ''}\n[DEVOLUCION PARCIAL $${montoDevolucion.toFixed(2)}] ${dto.motivo}`.trim(),
        },
      });

      // Liberar credito del cliente si aplica
      if (orden.clienteId) {
        const montoCredito = calcularMontoCredito(orden.pagos);

        if (montoCredito > 0) {
          // Liberar proporcionalmente al monto devuelto
          const proporcionDevuelta = montoDevolucion / Number(orden.total);
          const creditoALiberar = Math.min(
            montoCredito * proporcionDevuelta,
            montoCredito,
          );

          if (creditoALiberar > 0) {
            await tx.cliente.update({
              where: { id: orden.clienteId },
              data: { creditoUtilizado: { decrement: creditoALiberar } },
            });
          }
        }
      }

      await registrarAuditoria(tx.registroAuditoria, {
        empresaId,
        usuarioId,
        accion: esTotal ? 'DEVOLUCION_TOTAL_ORDEN' : 'DEVOLUCION_PARCIAL_ORDEN',
        entidad: 'ORDEN',
        entidadId: ordenId,
        valoresAnteriores: {
          estado: orden.estado,
          total: Number(orden.total),
        },
        valoresNuevos: {
          estado: nuevoEstado,
          motivo: dto.motivo,
          montoDevolucion,
          items: dto.items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
          })),
        },
      });

      return {
        orden: ordenActualizada,
        tipo: esTotal ? 'TOTAL' : 'PARCIAL',
        montoDevolucion,
        itemsDevueltos: dto.items.length,
      };
    });

    invalidarCacheModulo(MODULO);
    invalidarCacheModulo('INVENTARIO');

    logger.info({
      mensaje: `Devolucion ${resultado.tipo} procesada`,
      ordenId,
      montoDevolucion: resultado.montoDevolucion,
      items: resultado.itemsDevueltos,
      usuarioId,
    });

    return resultado;
  },
};
