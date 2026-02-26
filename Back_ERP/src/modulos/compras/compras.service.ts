/**
 * src/modulos/compras/compras.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de compras a proveedor.
 *
 * Flujo principal:
 * 1. ADMIN crea orden de compra con productos y costos
 * 2. Al recibir mercancia se marca como recibida
 * 3. Al recibir se ingresa automaticamente al inventario (ENTRADA)
 * 4. Se actualiza el precioCosto del producto al nuevo costo
 * ------------------------------------------------------------------
 */

import { Prisma } from '@prisma/client';
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
import type { CrearCompraDto, RecibirCompraDto, FiltroComprasDto } from './compras.schema';

const MODULO = 'COMPRAS';

export const ComprasService = {

  /**
   * Crea una orden de compra a proveedor.
   * NO afecta inventario hasta que se reciba la mercancia.
   */
  async crear(dto: CrearCompraDto, empresaId: string) {
    // Verificar proveedor
    const proveedor = await prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, empresaId, activo: true },
    });

    if (!proveedor) {
      throw new ErrorNoEncontrado('Proveedor no encontrado');
    }

    // Verificar productos
    const productosIds = dto.detalles.map((d) => d.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds }, empresaId, activo: true },
    });

    if (productos.length !== productosIds.length) {
      throw new ErrorPeticion('Uno o mas productos no existen o estan inactivos');
    }

    // Generar numero de compra secuencial
    const anio = dayjs().format('YYYY');
    const ultimaCompra = await prisma.compra.findFirst({
      where: {
        empresaId,
        numeroCompra: { startsWith: `COMP-${anio}-` },
      },
      orderBy: { creadoEn: 'desc' },
      select: { numeroCompra: true },
    });

    let secuencial = 1;
    if (ultimaCompra) {
      const partes = ultimaCompra.numeroCompra.split('-');
      secuencial = parseInt(partes[2], 10) + 1;
    }

    const numeroCompra = `COMP-${anio}-${String(secuencial).padStart(5, '0')}`;

    // Calcular totales
    let subtotal = 0;
    const detallesCalculados = dto.detalles.map((item) => {
      const itemSubtotal = item.costoUnitario * item.cantidad;
      subtotal += itemSubtotal;

      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
        subtotal: itemSubtotal,
      };
    });

    // IVA 16% sobre subtotal
    const montoImpuesto = subtotal * 0.16;
    const total = subtotal + montoImpuesto;

    // Crear compra con detalles
    const compra = await prisma.compra.create({
      data: {
        empresaId,
        proveedorId: dto.proveedorId,
        numeroCompra,
        numeroFactura: dto.numeroFactura ?? null,
        subtotal,
        montoImpuesto,
        total,
        notas: dto.notas ?? null,
        detalles: {
          createMany: { data: detallesCalculados },
        },
      },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
        },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Compra creada',
      compraId: compra.id,
      numeroCompra,
      total,
      items: dto.detalles.length,
    });

    return compra;
  },

  /**
   * Recibe mercancia de una compra: entra inventario y actualiza costo.
   * Usa transaccion atomica.
   */
  async recibir(compraId: string, dto: RecibirCompraDto, usuarioId: string, empresaId: string) {
    // Verificar compra
    const compra = await prisma.compra.findFirst({
      where: { id: compraId, empresaId },
      include: {
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!compra) {
      throw new ErrorNoEncontrado('Compra no encontrada');
    }

    if (compra.recibidaEn) {
      throw new ErrorNegocio('Esta compra ya fue recibida');
    }

    // Verificar almacen
    const almacen = await prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId, activo: true },
    });

    if (!almacen) {
      throw new ErrorNoEncontrado('Almacen no encontrado');
    }

    // Transaccion: marcar recibida + ingresar inventario + actualizar costos
    const compraRecibida = await prisma.$transaction(async (tx) => {
      // Marcar como recibida
      const actualizada = await tx.compra.update({
        where: { id: compraId },
        data: { recibidaEn: new Date() },
      });

      // Procesar cada detalle
      for (const detalle of compra.detalles) {
        // Buscar o crear existencia en el almacen destino
        let existencia = await tx.existencia.findFirst({
          where: {
            productoId: detalle.productoId,
            almacenId: dto.almacenId,
          },
        });

        let cantidadAnterior = 0;

        if (existencia) {
          cantidadAnterior = Number(existencia.cantidad);
        } else {
          existencia = await tx.existencia.create({
            data: {
              productoId: detalle.productoId,
              almacenId: dto.almacenId,
              cantidad: 0,
            },
          });
        }

        const cantidadPosterior = cantidadAnterior + Number(detalle.cantidad);

        // Actualizar existencia
        await tx.existencia.update({
          where: { id: existencia.id },
          data: { cantidad: cantidadPosterior },
        });

        // Registrar movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: detalle.productoId,
            almacenId: dto.almacenId,
            tipoMovimiento: 'ENTRADA',
            cantidad: Number(detalle.cantidad),
            cantidadAnterior,
            cantidadPosterior,
            costoUnitario: Number(detalle.costoUnitario),
            referenciaId: compraId,
            referenciaTipo: 'COMPRA',
            usuarioId,
          },
        });

        // Actualizar costo del producto
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: { precioCosto: detalle.costoUnitario },
        });
      }

      return actualizada;
    });

    invalidarCacheModulo(MODULO);
    invalidarCacheModulo('INVENTARIO');
    invalidarCacheModulo('PRODUCTOS');

    logger.info({
      mensaje: 'Compra recibida - inventario actualizado',
      compraId,
      almacenId: dto.almacenId,
      items: compra.detalles.length,
      usuarioId,
    });

    return compraRecibida;
  },

  /**
   * Obtiene una compra por ID con detalles.
   */
  async obtenerPorId(compraId: string, empresaId: string) {
    const compra = await prisma.compra.findFirst({
      where: { id: compraId, empresaId },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
        },
        proveedor: { select: { id: true, nombre: true, nombreContacto: true } },
      },
    });

    if (!compra) {
      throw new ErrorNoEncontrado('Compra no encontrada');
    }

    return compra;
  },

  /**
   * Lista compras con filtros y paginacion.
   */
  async listar(filtros: FiltroComprasDto, empresaId: string) {
    const cacheKey = `${MODULO}:listar:${empresaId}:${JSON.stringify(filtros)}`;
    const cached = cache.get<{ datos: unknown; meta: unknown }>(cacheKey);
    if (cached) return cached;

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };

    const where: Prisma.CompraWhereInput = { empresaId };

    if (filtros.proveedorId) {
      where.proveedorId = filtros.proveedorId;
    }

    if (filtros.recibida === 'true') {
      where.recibidaEn = { not: null };
    } else if (filtros.recibida === 'false') {
      where.recibidaEn = null;
    }

    if (filtros.buscar) {
      where.OR = [
        { numeroCompra: { contains: filtros.buscar, mode: 'insensitive' } },
        { numeroFactura: { contains: filtros.buscar, mode: 'insensitive' } },
        { proveedor: { nombre: { contains: filtros.buscar, mode: 'insensitive' } } },
      ];
    }

    const [datos, total] = await Promise.all([
      prisma.compra.findMany({
        where,
        ...paginar(parametros),
        orderBy: { creadoEn: 'desc' },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          _count: { select: { detalles: true } },
        },
      }),
      prisma.compra.count({ where }),
    ]);

    const meta = construirMeta(total, parametros);
    const resultado = { datos, meta };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },
};
