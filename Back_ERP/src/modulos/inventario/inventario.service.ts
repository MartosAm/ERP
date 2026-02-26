/**
 * src/modulos/inventario/inventario.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de inventario.
 *
 * Responsabilidades:
 * - Registrar movimientos de entrada/salida/ajuste/traslado
 * - Actualizar existencias en tiempo real
 * - Mantener historial inmutable (append-only en movimientos_inventario)
 * - Consultar existencias con filtro de stock bajo
 *
 * Reglas de negocio:
 * - No se permite stock negativo (SALIDA y TRASLADO validan existencia)
 * - Los movimientos son inmutables (nunca se actualizan ni eliminan)
 * - Cada movimiento almacena cantidadAnterior y cantidadPosterior (auditoria)
 * - TRASLADO descuenta de almacen origen y suma a almacen destino
 * ------------------------------------------------------------------
 */

import { Prisma, TipoMovimiento } from '@prisma/client';
import { prisma } from '../../config/database';
import { paginar, construirMeta } from '../../compartido/paginacion';
import { logger } from '../../compartido/logger';
import {
  ErrorNoEncontrado,
  ErrorNegocio,
} from '../../compartido/errores';
import type {
  CrearMovimientoDto,
  FiltroMovimientos,
  FiltroExistencias,
} from './inventario.schema';

/**
 * Mapea los tipos simplificados de la API a los valores del enum Prisma.
 * API usa: ENTRADA, SALIDA, AJUSTE, TRASLADO (simplificados)
 * Prisma usa: ENTRADA, SALIDA_VENTA, AJUSTE_MANUAL, MERMA, DEVOLUCION, TRASLADO
 */
const mapearTipoMovimiento = (tipo: string, referenciaTipo?: string): TipoMovimiento => {
  switch (tipo) {
    case 'ENTRADA':
      return TipoMovimiento.ENTRADA;
    case 'SALIDA':
      // Si la referencia indica merma, usar MERMA; si no, SALIDA_VENTA
      if (referenciaTipo === 'MERMA') return TipoMovimiento.MERMA;
      if (referenciaTipo === 'DEVOLUCION') return TipoMovimiento.DEVOLUCION;
      return TipoMovimiento.SALIDA_VENTA;
    case 'AJUSTE':
      return TipoMovimiento.AJUSTE_MANUAL;
    case 'TRASLADO':
      return TipoMovimiento.TRASLADO;
    default:
      return TipoMovimiento.AJUSTE_MANUAL;
  }
};

export const InventarioService = {

  // ================================================================
  // REGISTRAR MOVIMIENTO
  // ================================================================

  /**
   * Registra un movimiento de inventario y actualiza existencias.
   * Todo en una transaccion atomica para consistencia.
   *
   * @param empresaId - ID de la empresa
   * @param usuarioId - ID del usuario que registra
   * @param dto - Datos del movimiento validados por Zod
   * @returns Movimiento creado con existencia actualizada
   */
  async registrarMovimiento(empresaId: string, usuarioId: string, dto: CrearMovimientoDto) {
    // Validar que el producto existe y pertenece a la empresa
    const producto = await prisma.producto.findFirst({
      where: { id: dto.productoId, empresaId, activo: true },
    });

    if (!producto) {
      throw new ErrorNoEncontrado('Producto no encontrado');
    }

    if (!producto.rastrearInventario) {
      throw new ErrorNegocio('Este producto no tiene control de inventario habilitado');
    }

    // Validar que el almacen existe
    const almacen = await prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId, activo: true },
    });

    if (!almacen) {
      throw new ErrorNoEncontrado('Almacen no encontrado');
    }

    // Ejecutar en transaccion
    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener o crear existencia en almacen origen
      let existencia = await tx.existencia.findUnique({
        where: {
          productoId_almacenId: {
            productoId: dto.productoId,
            almacenId: dto.almacenId,
          },
        },
      });

      if (!existencia) {
        existencia = await tx.existencia.create({
          data: {
            productoId: dto.productoId,
            almacenId: dto.almacenId,
            cantidad: 0,
          },
        });
      }

      const cantidadAnterior = Number(existencia.cantidad);
      let cantidadPosterior: number;

      // Calcular nueva cantidad segun tipo de movimiento
      switch (dto.tipoMovimiento) {
        case 'ENTRADA':
          cantidadPosterior = cantidadAnterior + dto.cantidad;
          break;

        case 'SALIDA':
          if (cantidadAnterior < dto.cantidad) {
            throw new ErrorNegocio(
              `Stock insuficiente. Disponible: ${cantidadAnterior}, solicitado: ${dto.cantidad}`,
            );
          }
          cantidadPosterior = cantidadAnterior - dto.cantidad;
          break;

        case 'AJUSTE':
          // El ajuste establece la cantidad directamente
          cantidadPosterior = dto.cantidad;
          break;

        case 'TRASLADO':
          if (cantidadAnterior < dto.cantidad) {
            throw new ErrorNegocio(
              `Stock insuficiente para traslado. Disponible: ${cantidadAnterior}, solicitado: ${dto.cantidad}`,
            );
          }
          cantidadPosterior = cantidadAnterior - dto.cantidad;
          break;

        default:
          throw new ErrorNegocio('Tipo de movimiento no soportado');
      }

      // Actualizar existencia en almacen origen
      await tx.existencia.update({
        where: { id: existencia.id },
        data: { cantidad: cantidadPosterior },
      });

      // Para traslados: sumar en almacen destino
      if (dto.tipoMovimiento === 'TRASLADO' && dto.almacenDestinoId) {
        await tx.existencia.upsert({
          where: {
            productoId_almacenId: {
              productoId: dto.productoId,
              almacenId: dto.almacenDestinoId,
            },
          },
          create: {
            productoId: dto.productoId,
            almacenId: dto.almacenDestinoId,
            cantidad: dto.cantidad,
          },
          update: {
            cantidad: { increment: dto.cantidad },
          },
        });
      }

      // Crear registro de movimiento (inmutable)
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId: dto.productoId,
          almacenId: dto.almacenId,
          almacenDestinoId: dto.almacenDestinoId,
          tipoMovimiento: mapearTipoMovimiento(dto.tipoMovimiento, dto.referenciaTipo),
          cantidad: dto.cantidad,
          cantidadAnterior: dto.tipoMovimiento === 'AJUSTE' ? cantidadAnterior : cantidadAnterior,
          cantidadPosterior,
          costoUnitario: dto.costoUnitario,
          motivo: dto.motivo,
          referenciaId: dto.referenciaId,
          referenciaTipo: dto.referenciaTipo,
          usuarioId,
        },
        select: {
          id: true,
          tipoMovimiento: true,
          cantidad: true,
          cantidadAnterior: true,
          cantidadPosterior: true,
          motivo: true,
          creadoEn: true,
          producto: { select: { id: true, nombre: true, sku: true } },
          almacen: { select: { id: true, nombre: true } },
        },
      });

      return movimiento;
    });

    logger.info({
      mensaje: 'Movimiento de inventario registrado',
      movimientoId: resultado.id,
      tipo: dto.tipoMovimiento,
      productoId: dto.productoId,
      cantidad: dto.cantidad,
      usuarioId,
    });

    return resultado;
  },

  // ================================================================
  // HISTORIAL DE MOVIMIENTOS
  // ================================================================

  /**
   * Lista movimientos de inventario con filtros y paginacion.
   * Ordenados por fecha descendente (mas recientes primero).
   */
  async listarMovimientos(empresaId: string, filtros: FiltroMovimientos) {
    const where: Record<string, unknown> = {
      producto: { empresaId },
    };

    if (filtros.productoId) where.productoId = filtros.productoId;
    if (filtros.almacenId) where.almacenId = filtros.almacenId;
    if (filtros.tipoMovimiento) where.tipoMovimiento = filtros.tipoMovimiento;

    // Filtro de rango de fechas
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const creadoEn: Record<string, Date> = {};
      if (filtros.fechaDesde) creadoEn.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) creadoEn.lte = filtros.fechaHasta;
      where.creadoEn = creadoEn;
    }

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        ...paginar(parametros),
        select: {
          id: true,
          tipoMovimiento: true,
          cantidad: true,
          cantidadAnterior: true,
          cantidadPosterior: true,
          costoUnitario: true,
          motivo: true,
          referenciaId: true,
          referenciaTipo: true,
          creadoEn: true,
          producto: { select: { id: true, nombre: true, sku: true } },
          almacen: { select: { id: true, nombre: true } },
          almacenDestino: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
      }),
      prisma.movimientoInventario.count({ where }),
    ]);

    return {
      datos: movimientos,
      meta: construirMeta(total, parametros),
    };
  },

  // ================================================================
  // EXISTENCIAS (Stock actual)
  // ================================================================

  /**
   * Lista existencias actuales con soporte para filtro de stock bajo.
   * Puede filtrar por almacen y buscar por nombre/SKU de producto.
   */
  async listarExistencias(empresaId: string, filtros: FiltroExistencias) {
    const where: Prisma.ExistenciaWhereInput = {
      producto: { empresaId, activo: true },
    };

    if (filtros.almacenId) {
      where.almacenId = filtros.almacenId;
    }

    if (filtros.buscar) {
      where.producto = {
        ...(where.producto as Prisma.ProductoWhereInput),
        OR: [
          { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
          { sku: { contains: filtros.buscar, mode: 'insensitive' } },
        ],
      };
    }

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [existencias, total] = await Promise.all([
      prisma.existencia.findMany({
        where,
        ...paginar(parametros),
        select: {
          id: true,
          cantidad: true,
          actualizadoEn: true,
          producto: {
            select: {
              id: true,
              sku: true,
              nombre: true,
              stockMinimo: true,
              etiquetaUnidad: true,
              imagenUrl: true,
            },
          },
          almacen: { select: { id: true, nombre: true, esPrincipal: true } },
        },
        orderBy: [
          { producto: { nombre: 'asc' } },
        ],
      }),
      prisma.existencia.count({ where }),
    ]);

    // Post-filtro: stock bajo (cantidad < stockMinimo del producto)
    let datosFiltrados = existencias;
    if (filtros.stockBajo) {
      datosFiltrados = existencias.filter(
        (e) => Number(e.cantidad) < Number(e.producto.stockMinimo),
      );
    }

    return {
      datos: datosFiltrados,
      meta: construirMeta(total, parametros),
    };
  },
};
