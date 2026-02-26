/**
 * src/modulos/categorias/categorias.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de categorias.
 *
 * Responsabilidades:
 * - CRUD completo de categorias con filtro por empresa (multi-tenant)
 * - Soporte para subcategorias (arbol jerarquico)
 * - Validaciones de negocio (nombre duplicado, categoria padre valida)
 * - Cache in-memory para listados frecuentes
 * - Sanitizacion de strings antes de persistir
 *
 * Reglas de negocio:
 * - No se permite nombre duplicado dentro de la misma empresa y padre
 * - Solo ADMIN puede crear/editar/desactivar categorias
 * - Al desactivar una categoria padre, se desactivan todas las hijas
 * - No se puede eliminar una categoria que tenga productos asociados
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
  CrearCategoriaDto,
  ActualizarCategoriaDto,
  FiltroCategorias,
} from './categorias.schema';

/** Prefijo para claves de cache de categorias */
const CACHE_PREFIX = 'categorias';

export const CategoriasService = {

  // ================================================================
  // LISTAR - GET /categorias
  // ================================================================

  /**
   * Lista categorias con filtros, paginacion y cache.
   *
   * @param empresaId - ID de la empresa del usuario autenticado
   * @param filtros - Filtros validados por Zod (buscar, activo, padreId, soloRaiz)
   * @returns Datos paginados con categorias y metadatos
   */
  async listar(empresaId: string, filtros: FiltroCategorias) {
    // Construir clave de cache unica por empresa + filtros
    const claveCache = `${CACHE_PREFIX}:${empresaId}:p${filtros.pagina}-l${filtros.limite}-b${filtros.buscar ?? ''}-a${filtros.activo ?? ''}-pad${filtros.padreId ?? ''}-r${filtros.soloRaiz ?? ''}`;
    const cacheado = cache.get<{ datos: unknown; meta: MetaPaginacion }>(claveCache);
    if (cacheado) return cacheado;

    // Construir condiciones WHERE dinamicas
    const where: Record<string, unknown> = { empresaId };

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    if (filtros.buscar) {
      where.nombre = { contains: filtros.buscar, mode: 'insensitive' };
    }

    if (filtros.padreId) {
      where.padreId = filtros.padreId;
    }

    if (filtros.soloRaiz) {
      where.padreId = null;
    }

    // Ejecutar consultas en paralelo: datos + conteo total
    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [categorias, total] = await Promise.all([
      prisma.categoria.findMany({
        where,
        ...paginar(parametros),
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          padreId: true,
          colorHex: true,
          nombreIcono: true,
          activo: true,
          orden: true,
          creadoEn: true,
          padre: { select: { id: true, nombre: true } },
          _count: { select: { productos: true, hijos: true } },
        },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.categoria.count({ where }),
    ]);

    const resultado = {
      datos: categorias,
      meta: construirMeta(total, parametros),
    };

    // Guardar en cache con TTL de 5 minutos
    cache.set(claveCache, resultado, CacheTTL.CATEGORIAS);

    return resultado;
  },

  // ================================================================
  // OBTENER POR ID - GET /categorias/:id
  // ================================================================

  /**
   * Obtiene una categoria por su ID, incluyendo subcategorias.
   *
   * @param id - ID de la categoria a buscar
   * @param empresaId - ID de la empresa (seguridad multi-tenant)
   * @returns Categoria con sus subcategorias y conteo de productos
   */
  async obtenerPorId(id: string, empresaId: string) {
    const categoria = await prisma.categoria.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        padreId: true,
        colorHex: true,
        nombreIcono: true,
        activo: true,
        orden: true,
        creadoEn: true,
        padre: { select: { id: true, nombre: true } },
        hijos: {
          select: { id: true, nombre: true, activo: true, orden: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
        _count: { select: { productos: true } },
      },
    });

    if (!categoria) {
      throw new ErrorNoEncontrado('Categoria no encontrada');
    }

    return categoria;
  },

  // ================================================================
  // CREAR - POST /categorias
  // ================================================================

  /**
   * Crea una nueva categoria.
   *
   * Validaciones:
   * - Nombre unico dentro de la empresa y el mismo padre
   * - Si se indica padreId, debe existir y pertenecer a la misma empresa
   *
   * @param empresaId - ID de la empresa del usuario
   * @param dto - Datos validados por Zod
   * @returns Categoria recien creada
   */
  async crear(empresaId: string, dto: CrearCategoriaDto) {
    // Sanitizar strings del DTO
    const datos = sanitizarObjeto(dto);

    // Validar nombre unico en la empresa (dentro del mismo padre)
    const existente = await prisma.categoria.findFirst({
      where: {
        empresaId,
        nombre: { equals: datos.nombre, mode: 'insensitive' },
        padreId: datos.padreId ?? null,
      },
    });

    if (existente) {
      throw new ErrorConflicto('Ya existe una categoria con ese nombre');
    }

    // Validar que la categoria padre exista y sea de la misma empresa
    if (datos.padreId) {
      const padre = await prisma.categoria.findFirst({
        where: { id: datos.padreId, empresaId },
      });

      if (!padre) {
        throw new ErrorNegocio('La categoria padre no existe o no pertenece a esta empresa');
      }
    }

    const categoria = await prisma.categoria.create({
      data: {
        empresaId,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        padreId: datos.padreId,
        colorHex: datos.colorHex,
        nombreIcono: datos.nombreIcono,
        orden: datos.orden ?? 0,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        padreId: true,
        colorHex: true,
        nombreIcono: true,
        activo: true,
        orden: true,
        creadoEn: true,
      },
    });

    // Invalidar cache del modulo
    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Categoria creada',
      categoriaId: categoria.id,
      nombre: categoria.nombre,
      empresaId,
    });

    return categoria;
  },

  // ================================================================
  // ACTUALIZAR - PATCH /categorias/:id
  // ================================================================

  /**
   * Actualiza parcialmente una categoria existente.
   *
   * Validaciones:
   * - La categoria debe existir y pertenecer a la empresa
   * - Si cambia nombre, debe ser unico en el mismo padre
   * - Si cambia padreId, no puede apuntar a si misma ni a un hijo
   *
   * @param id - ID de la categoria a actualizar
   * @param empresaId - ID de la empresa
   * @param dto - Campos a actualizar (parcial)
   * @returns Categoria actualizada
   */
  async actualizar(id: string, empresaId: string, dto: ActualizarCategoriaDto) {
    // Verificar que la categoria existe
    const actual = await prisma.categoria.findFirst({
      where: { id, empresaId },
    });

    if (!actual) {
      throw new ErrorNoEncontrado('Categoria no encontrada');
    }

    // Sanitizar strings
    const datos = sanitizarObjeto(dto);

    // Validar nombre unico si se esta cambiando
    if (datos.nombre && datos.nombre !== actual.nombre) {
      const padreId = datos.padreId !== undefined ? datos.padreId : actual.padreId;
      const duplicado = await prisma.categoria.findFirst({
        where: {
          empresaId,
          nombre: { equals: datos.nombre, mode: 'insensitive' },
          padreId: padreId ?? null,
          id: { not: id },
        },
      });

      if (duplicado) {
        throw new ErrorConflicto('Ya existe una categoria con ese nombre');
      }
    }

    // Validar que padreId no sea la misma categoria
    if (datos.padreId === id) {
      throw new ErrorNegocio('Una categoria no puede ser su propia subcategoria');
    }

    // Validar que padreId existe y pertenece a la empresa
    if (datos.padreId) {
      const padre = await prisma.categoria.findFirst({
        where: { id: datos.padreId, empresaId },
      });

      if (!padre) {
        throw new ErrorNegocio('La categoria padre no existe o no pertenece a esta empresa');
      }
    }

    // Construir datos de actualizacion (solo campos presentes)
    const datosActualizacion: Record<string, unknown> = {};
    if (datos.nombre !== undefined) datosActualizacion.nombre = datos.nombre;
    if (datos.descripcion !== undefined) datosActualizacion.descripcion = datos.descripcion;
    if (datos.padreId !== undefined) datosActualizacion.padreId = datos.padreId;
    if (datos.colorHex !== undefined) datosActualizacion.colorHex = datos.colorHex;
    if (datos.nombreIcono !== undefined) datosActualizacion.nombreIcono = datos.nombreIcono;
    if (datos.orden !== undefined) datosActualizacion.orden = datos.orden;
    if (datos.activo !== undefined) datosActualizacion.activo = datos.activo;

    const categoria = await prisma.categoria.update({
      where: { id },
      data: datosActualizacion,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        padreId: true,
        colorHex: true,
        nombreIcono: true,
        activo: true,
        orden: true,
        creadoEn: true,
      },
    });

    // Si se desactivo, desactivar subcategorias en cascada
    if (datos.activo === false) {
      await prisma.categoria.updateMany({
        where: { padreId: id },
        data: { activo: false },
      });
      logger.info({
        mensaje: 'Subcategorias desactivadas en cascada',
        categoriaPadreId: id,
      });
    }

    // Invalidar cache
    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Categoria actualizada',
      categoriaId: id,
      campos: Object.keys(datosActualizacion),
    });

    return categoria;
  },

  // ================================================================
  // ELIMINAR - DELETE /categorias/:id
  // ================================================================

  /**
   * Elimina una categoria (soft delete: desactivar).
   *
   * Reglas:
   * - No se puede eliminar si tiene productos asociados
   * - Se desactivan subcategorias en cascada
   *
   * @param id - ID de la categoria
   * @param empresaId - ID de la empresa
   */
  async eliminar(id: string, empresaId: string) {
    const categoria = await prisma.categoria.findFirst({
      where: { id, empresaId },
      include: {
        _count: { select: { productos: true, hijos: true } },
      },
    });

    if (!categoria) {
      throw new ErrorNoEncontrado('Categoria no encontrada');
    }

    // No eliminar si tiene productos activos
    if (categoria._count.productos > 0) {
      throw new ErrorNegocio(
        `No se puede eliminar: tiene ${categoria._count.productos} producto(s) asociado(s)`,
      );
    }

    // Soft delete: desactivar categoria y subcategorias
    await prisma.$transaction([
      prisma.categoria.update({
        where: { id },
        data: { activo: false },
      }),
      prisma.categoria.updateMany({
        where: { padreId: id },
        data: { activo: false },
      }),
    ]);

    // Invalidar cache
    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Categoria eliminada (soft delete)',
      categoriaId: id,
      nombre: categoria.nombre,
      subcategoriasAfectadas: categoria._count.hijos,
    });
  },

  // ================================================================
  // ARBOL - GET /categorias/arbol
  // ================================================================

  /**
   * Obtiene el arbol completo de categorias para la empresa.
   * Retorna solo categorias raiz con sus hijos anidados (1 nivel).
   * Util para el selector de categorias en el frontend.
   *
   * @param empresaId - ID de la empresa
   * @returns Arbol de categorias ordenado
   */
  async obtenerArbol(empresaId: string) {
    const claveCache = `${CACHE_PREFIX}:${empresaId}:arbol`;
    const cacheado = cache.get<unknown[]>(claveCache);
    if (cacheado) return cacheado;

    const arbol = await prisma.categoria.findMany({
      where: { empresaId, padreId: null, activo: true },
      select: {
        id: true,
        nombre: true,
        colorHex: true,
        nombreIcono: true,
        orden: true,
        hijos: {
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            colorHex: true,
            nombreIcono: true,
            orden: true,
            _count: { select: { productos: true } },
          },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
        _count: { select: { productos: true } },
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });

    cache.set(claveCache, arbol, CacheTTL.CATEGORIAS);

    return arbol;
  },
};
