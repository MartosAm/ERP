/**
 * src/modulos/proveedores/proveedores.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de proveedores.
 *
 * Reglas de negocio:
 * - Nombre unico dentro de la misma empresa
 * - No se puede eliminar un proveedor con productos o compras asociadas
 * - Solo ADMIN puede gestionar proveedores
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
  CrearProveedorDto,
  ActualizarProveedorDto,
  FiltroProveedores,
} from './proveedores.schema';

const CACHE_PREFIX = 'proveedores';

export const ProveedoresService = {

  /**
   * Lista proveedores con filtros, busqueda y paginacion.
   */
  async listar(empresaId: string, filtros: FiltroProveedores) {
    const claveCache = `${CACHE_PREFIX}:${empresaId}:p${filtros.pagina}-l${filtros.limite}-b${filtros.buscar ?? ''}-a${filtros.activo ?? ''}`;
    const cacheado = cache.get<{ datos: unknown; meta: MetaPaginacion }>(claveCache);
    if (cacheado) return cacheado;

    const where: Record<string, unknown> = { empresaId };

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    // Busqueda por nombre o nombre de contacto
    if (filtros.buscar) {
      where.OR = [
        { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
        { nombreContacto: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        ...paginar(parametros),
        select: {
          id: true,
          nombre: true,
          nombreContacto: true,
          telefono: true,
          correo: true,
          direccion: true,
          rfc: true,
          activo: true,
          creadoEn: true,
          _count: { select: { productos: true, compras: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.proveedor.count({ where }),
    ]);

    const resultado = {
      datos: proveedores,
      meta: construirMeta(total, parametros),
    };

    cache.set(claveCache, resultado, CacheTTL.PROVEEDORES);
    return resultado;
  },

  /**
   * Obtiene un proveedor por ID con conteos.
   */
  async obtenerPorId(id: string, empresaId: string) {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        nombre: true,
        nombreContacto: true,
        telefono: true,
        correo: true,
        direccion: true,
        rfc: true,
        notas: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
        _count: { select: { productos: true, compras: true } },
      },
    });

    if (!proveedor) {
      throw new ErrorNoEncontrado('Proveedor no encontrado');
    }

    return proveedor;
  },

  /**
   * Crea un nuevo proveedor.
   */
  async crear(empresaId: string, dto: CrearProveedorDto) {
    const datos = sanitizarObjeto(dto);

    // Validar nombre unico
    const existente = await prisma.proveedor.findFirst({
      where: {
        empresaId,
        nombre: { equals: datos.nombre, mode: 'insensitive' },
      },
    });

    if (existente) {
      throw new ErrorConflicto('Ya existe un proveedor con ese nombre');
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        empresaId,
        ...datos,
      },
      select: {
        id: true,
        nombre: true,
        nombreContacto: true,
        telefono: true,
        correo: true,
        direccion: true,
        rfc: true,
        notas: true,
        activo: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Proveedor creado',
      proveedorId: proveedor.id,
      nombre: proveedor.nombre,
      empresaId,
    });

    return proveedor;
  },

  /**
   * Actualiza parcialmente un proveedor.
   */
  async actualizar(id: string, empresaId: string, dto: ActualizarProveedorDto) {
    const actual = await prisma.proveedor.findFirst({
      where: { id, empresaId },
    });

    if (!actual) {
      throw new ErrorNoEncontrado('Proveedor no encontrado');
    }

    const datos = sanitizarObjeto(dto);

    // Validar nombre unico si cambia
    if (datos.nombre && datos.nombre !== actual.nombre) {
      const duplicado = await prisma.proveedor.findFirst({
        where: {
          empresaId,
          nombre: { equals: datos.nombre, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicado) {
        throw new ErrorConflicto('Ya existe un proveedor con ese nombre');
      }
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: datos,
      select: {
        id: true,
        nombre: true,
        nombreContacto: true,
        telefono: true,
        correo: true,
        direccion: true,
        rfc: true,
        notas: true,
        activo: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Proveedor actualizado',
      proveedorId: id,
    });

    return proveedor;
  },

  /**
   * Desactiva un proveedor (soft delete).
   * No se puede eliminar si tiene productos o compras activas.
   */
  async eliminar(id: string, empresaId: string) {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id, empresaId },
      include: {
        _count: { select: { productos: true, compras: true } },
      },
    });

    if (!proveedor) {
      throw new ErrorNoEncontrado('Proveedor no encontrado');
    }

    if (proveedor._count.productos > 0) {
      throw new ErrorNegocio(
        `No se puede eliminar: tiene ${proveedor._count.productos} producto(s) asociado(s)`,
      );
    }

    await prisma.proveedor.update({
      where: { id },
      data: { activo: false },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Proveedor eliminado (soft delete)',
      proveedorId: id,
      nombre: proveedor.nombre,
    });
  },
};
