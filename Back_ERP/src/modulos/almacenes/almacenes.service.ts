/**
 * src/modulos/almacenes/almacenes.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de almacenes.
 *
 * Reglas de negocio:
 * - Solo puede haber un almacen principal por empresa
 * - No se permite nombre duplicado dentro de la misma empresa
 * - No se puede desactivar un almacen que tenga existencias activas
 * - Solo ADMIN puede gestionar almacenes
 * ------------------------------------------------------------------
 */

import { prisma } from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo } from '../../config/cache';
import { sanitizarObjeto } from '../../compartido/sanitizar';
import { paginar, construirMeta } from '../../compartido/paginacion';
import { logger } from '../../compartido/logger';
import type { MetaPaginacion } from '../../compartido/respuesta';
import {
  ErrorNoEncontrado,
  ErrorConflicto,
  ErrorNegocio,
} from '../../compartido/errores';
import type {
  CrearAlmacenDto,
  ActualizarAlmacenDto,
  FiltroAlmacenes,
} from './almacenes.schema';

const CACHE_PREFIX = 'almacenes';

export const AlmacenesService = {

  // ================================================================
  // LISTAR - GET /almacenes
  // ================================================================

  /**
   * Lista almacenes con filtros y paginacion.
   *
   * @param empresaId - ID de la empresa del usuario autenticado
   * @param filtros - Filtros validados por Zod
   * @returns Datos paginados de almacenes
   */
  async listar(empresaId: string, filtros: FiltroAlmacenes) {
    const claveCache = `${CACHE_PREFIX}:${empresaId}:p${filtros.pagina}-l${filtros.limite}-b${filtros.buscar ?? ''}-a${filtros.activo ?? ''}`;
    const cacheado = cache.get<{ datos: unknown; meta: MetaPaginacion }>(claveCache);
    if (cacheado) return cacheado;

    const where: Record<string, unknown> = { empresaId };

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    if (filtros.buscar) {
      where.nombre = { contains: filtros.buscar, mode: 'insensitive' };
    }

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [almacenes, total] = await Promise.all([
      prisma.almacen.findMany({
        where,
        ...paginar(parametros),
        select: {
          id: true,
          nombre: true,
          direccion: true,
          esPrincipal: true,
          activo: true,
          creadoEn: true,
          _count: { select: { existencias: true } },
        },
        orderBy: [{ esPrincipal: 'desc' }, { nombre: 'asc' }],
      }),
      prisma.almacen.count({ where }),
    ]);

    const resultado = {
      datos: almacenes,
      meta: construirMeta(total, parametros),
    };

    cache.set(claveCache, resultado, CacheTTL.ALMACENES);
    return resultado;
  },

  // ================================================================
  // OBTENER POR ID - GET /almacenes/:id
  // ================================================================

  /**
   * Obtiene un almacen por ID con conteo de existencias.
   */
  async obtenerPorId(id: string, empresaId: string) {
    const almacen = await prisma.almacen.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        esPrincipal: true,
        activo: true,
        creadoEn: true,
        _count: { select: { existencias: true, movimientos: true } },
      },
    });

    if (!almacen) {
      throw new ErrorNoEncontrado('Almacen no encontrado');
    }

    return almacen;
  },

  // ================================================================
  // CREAR - POST /almacenes
  // ================================================================

  /**
   * Crea un nuevo almacen.
   *
   * Validaciones:
   * - Nombre unico dentro de la empresa
   * - Si se marca como principal, quitar bandera del anterior principal
   */
  async crear(empresaId: string, dto: CrearAlmacenDto) {
    const datos = sanitizarObjeto(dto);

    // Validar nombre unico
    const existente = await prisma.almacen.findFirst({
      where: {
        empresaId,
        nombre: { equals: datos.nombre, mode: 'insensitive' },
      },
    });

    if (existente) {
      throw new ErrorConflicto('Ya existe un almacen con ese nombre');
    }

    // Si es principal, desmarcar el actual principal
    if (datos.esPrincipal) {
      await prisma.almacen.updateMany({
        where: { empresaId, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }

    const almacen = await prisma.almacen.create({
      data: {
        empresaId,
        nombre: datos.nombre,
        direccion: datos.direccion,
        esPrincipal: datos.esPrincipal ?? false,
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        esPrincipal: true,
        activo: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Almacen creado',
      almacenId: almacen.id,
      nombre: almacen.nombre,
      empresaId,
    });

    return almacen;
  },

  // ================================================================
  // ACTUALIZAR - PATCH /almacenes/:id
  // ================================================================

  /**
   * Actualiza parcialmente un almacen.
   */
  async actualizar(id: string, empresaId: string, dto: ActualizarAlmacenDto) {
    const actual = await prisma.almacen.findFirst({
      where: { id, empresaId },
    });

    if (!actual) {
      throw new ErrorNoEncontrado('Almacen no encontrado');
    }

    const datos = sanitizarObjeto(dto);

    // Validar nombre unico si cambia
    if (datos.nombre && datos.nombre !== actual.nombre) {
      const duplicado = await prisma.almacen.findFirst({
        where: {
          empresaId,
          nombre: { equals: datos.nombre, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicado) {
        throw new ErrorConflicto('Ya existe un almacen con ese nombre');
      }
    }

    // Si se marca como principal, desmarcar otros
    if (datos.esPrincipal === true && !actual.esPrincipal) {
      await prisma.almacen.updateMany({
        where: { empresaId, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }

    const datosActualizacion: Record<string, unknown> = {};
    if (datos.nombre !== undefined) datosActualizacion.nombre = datos.nombre;
    if (datos.direccion !== undefined) datosActualizacion.direccion = datos.direccion;
    if (datos.esPrincipal !== undefined) datosActualizacion.esPrincipal = datos.esPrincipal;
    if (datos.activo !== undefined) datosActualizacion.activo = datos.activo;

    const almacen = await prisma.almacen.update({
      where: { id },
      data: datosActualizacion,
      select: {
        id: true,
        nombre: true,
        direccion: true,
        esPrincipal: true,
        activo: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Almacen actualizado',
      almacenId: id,
      campos: Object.keys(datosActualizacion),
    });

    return almacen;
  },

  // ================================================================
  // ELIMINAR - DELETE /almacenes/:id
  // ================================================================

  /**
   * Desactiva un almacen (soft delete).
   * No se puede desactivar si tiene existencias registradas.
   */
  async eliminar(id: string, empresaId: string) {
    const almacen = await prisma.almacen.findFirst({
      where: { id, empresaId },
      include: {
        _count: { select: { existencias: true } },
      },
    });

    if (!almacen) {
      throw new ErrorNoEncontrado('Almacen no encontrado');
    }

    if (almacen._count.existencias > 0) {
      throw new ErrorNegocio(
        `No se puede eliminar: tiene ${almacen._count.existencias} registro(s) de existencias`,
      );
    }

    if (almacen.esPrincipal) {
      throw new ErrorNegocio('No se puede eliminar el almacen principal');
    }

    await prisma.almacen.update({
      where: { id },
      data: { activo: false },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Almacen eliminado (soft delete)',
      almacenId: id,
      nombre: almacen.nombre,
    });
  },
};
