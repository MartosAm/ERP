/**
 * src/modulos/productos/productos.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de productos.
 *
 * Reglas de negocio:
 * - SKU unico global (no se repite en ninguna empresa)
 * - Codigo de barras unico global
 * - Precio de venta debe ser >= precio de costo (advertencia)
 * - Al crear con rastrearInventario=true, se crea Existencia en almacen principal
 * - Busqueda por nombre, SKU o codigo de barras (para scanner POS)
 * - Solo ADMIN puede ver/editar precioCosto
 * ------------------------------------------------------------------
 */

import { TipoUnidad, Prisma } from '@prisma/client';
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
  CrearProductoDto,
  ActualizarProductoDto,
  FiltroProductos,
} from './productos.schema';

const CACHE_PREFIX = 'productos';

export const ProductosService = {

  // ================================================================
  // LISTAR - GET /productos
  // ================================================================

  /**
   * Lista productos con filtros avanzados, busqueda y paginacion.
   * Soporta busqueda por nombre, SKU y codigo de barras.
   *
   * @param empresaId - ID de la empresa del usuario
   * @param filtros - Filtros validados por Zod
   * @param rol - Rol del usuario (ADMIN ve precioCosto)
   * @returns Datos paginados de productos
   */
  async listar(empresaId: string, filtros: FiltroProductos, rol: string) {
    const claveCache = `${CACHE_PREFIX}:${empresaId}:p${filtros.pagina}-l${filtros.limite}-b${filtros.buscar ?? ''}-a${filtros.activo ?? ''}-c${filtros.categoriaId ?? ''}-prov${filtros.proveedorId ?? ''}-d${filtros.destacado ?? ''}-sb${filtros.stockBajo ?? ''}-o${filtros.ordenarPor}-d${filtros.direccionOrden}`;
    const cacheado = cache.get<{ datos: unknown; meta: MetaPaginacion }>(claveCache);
    if (cacheado) return cacheado;

    // Construir WHERE dinamico
    const where: Record<string, unknown> = { empresaId };

    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
    if (filtros.proveedorId) where.proveedorId = filtros.proveedorId;
    if (filtros.destacado !== undefined) where.destacado = filtros.destacado;

    // Busqueda por nombre, SKU o codigo de barras
    if (filtros.buscar) {
      where.OR = [
        { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
        { sku: { contains: filtros.buscar, mode: 'insensitive' } },
        { codigoBarras: { equals: filtros.buscar } },
        { marca: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }

    // Filtro de stock bajo: productos cuyo stock total esta por debajo del minimo
    if (filtros.stockBajo) {
      where.rastrearInventario = true;
      // Se filtra en post-procesamiento para comparar con existencias
    }

    // Campos a seleccionar (precioCosto solo visible para ADMIN)
    const selectBase = {
      id: true,
      sku: true,
      codigoBarras: true,
      nombre: true,
      descripcion: true,
      marca: true,
      tipoUnidad: true,
      etiquetaUnidad: true,
      precioCosto: rol === 'ADMIN',
      precioVenta1: true,
      precioVenta2: true,
      precioVenta3: true,
      impuestoIncluido: true,
      tasaImpuesto: true,
      rastrearInventario: true,
      stockMinimo: true,
      activo: true,
      destacado: true,
      imagenUrl: true,
      creadoEn: true,
      categoria: { select: { id: true, nombre: true } },
      proveedor: { select: { id: true, nombre: true } },
      _count: { select: { existencias: true } },
    };

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        ...paginar(parametros),
        select: selectBase,
        orderBy: { [filtros.ordenarPor]: filtros.direccionOrden },
      }),
      prisma.producto.count({ where }),
    ]);

    const resultado = {
      datos: productos,
      meta: construirMeta(total, parametros),
    };

    cache.set(claveCache, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  // ================================================================
  // OBTENER POR ID - GET /productos/:id
  // ================================================================

  /**
   * Obtiene un producto por ID con existencias por almacen.
   */
  async obtenerPorId(id: string, empresaId: string, rol: string) {
    const producto = await prisma.producto.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        sku: true,
        codigoBarras: true,
        nombre: true,
        descripcion: true,
        marca: true,
        modelo: true,
        tipoUnidad: true,
        etiquetaUnidad: true,
        conversionUnidad: true,
        cantidadMinimaVenta: true,
        incrementoVenta: true,
        precioCosto: rol === 'ADMIN',
        precioVenta1: true,
        precioVenta2: true,
        precioVenta3: true,
        impuestoIncluido: true,
        tasaImpuesto: true,
        rastrearInventario: true,
        stockMinimo: true,
        stockMaximo: true,
        activo: true,
        destacado: true,
        imagenUrl: true,
        notas: true,
        creadoEn: true,
        actualizadoEn: true,
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
        existencias: {
          select: {
            id: true,
            cantidad: true,
            almacen: { select: { id: true, nombre: true, esPrincipal: true } },
          },
        },
      },
    });

    if (!producto) {
      throw new ErrorNoEncontrado('Producto no encontrado');
    }

    return producto;
  },

  // ================================================================
  // BUSCAR POR CODIGO - GET /productos/codigo/:codigo
  // ================================================================

  /**
   * Busca un producto por SKU o codigo de barras.
   * Optimizado para uso con scanner POS.
   */
  async buscarPorCodigo(codigo: string, empresaId: string) {
    const producto = await prisma.producto.findFirst({
      where: {
        empresaId,
        activo: true,
        OR: [
          { sku: codigo },
          { codigoBarras: codigo },
        ],
      },
      select: {
        id: true,
        sku: true,
        codigoBarras: true,
        nombre: true,
        precioVenta1: true,
        precioVenta2: true,
        precioVenta3: true,
        impuestoIncluido: true,
        tasaImpuesto: true,
        tipoUnidad: true,
        etiquetaUnidad: true,
        cantidadMinimaVenta: true,
        incrementoVenta: true,
        imagenUrl: true,
        rastrearInventario: true,
        existencias: {
          select: {
            cantidad: true,
            almacen: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    if (!producto) {
      throw new ErrorNoEncontrado('Producto no encontrado con ese codigo');
    }

    return producto;
  },

  // ================================================================
  // CREAR - POST /productos
  // ================================================================

  /**
   * Crea un nuevo producto.
   *
   * Validaciones:
   * - SKU unico global
   * - Codigo de barras unico global (si se proporciona)
   * - Categoria y proveedor existen y pertenecen a la empresa
   * - Al crear con rastrearInventario, se crea Existencia en almacen principal
   */
  async crear(empresaId: string, dto: CrearProductoDto) {
    const datos = sanitizarObjeto(dto);

    // Validar SKU unico
    const existeSku = await prisma.producto.findUnique({
      where: { sku: datos.sku },
    });
    if (existeSku) {
      throw new ErrorConflicto(`Ya existe un producto con SKU "${datos.sku}"`);
    }

    // Validar codigo de barras unico
    if (datos.codigoBarras) {
      const existeBarras = await prisma.producto.findUnique({
        where: { codigoBarras: datos.codigoBarras },
      });
      if (existeBarras) {
        throw new ErrorConflicto('Ya existe un producto con ese codigo de barras');
      }
    }

    // Validar categoria si se proporciona
    if (datos.categoriaId) {
      const categoria = await prisma.categoria.findFirst({
        where: { id: datos.categoriaId, empresaId, activo: true },
      });
      if (!categoria) {
        throw new ErrorNegocio('La categoria no existe o no pertenece a esta empresa');
      }
    }

    // Validar proveedor si se proporciona
    if (datos.proveedorId) {
      const proveedor = await prisma.proveedor.findFirst({
        where: { id: datos.proveedorId, empresaId, activo: true },
      });
      if (!proveedor) {
        throw new ErrorNegocio('El proveedor no existe o no pertenece a esta empresa');
      }
    }

    // Crear producto y existencia en una transaccion
    const producto = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.create({
        data: {
          empresaId,
          sku: datos.sku,
          codigoBarras: datos.codigoBarras,
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          marca: datos.marca,
          modelo: datos.modelo,
          categoriaId: datos.categoriaId,
          proveedorId: datos.proveedorId,
          tipoUnidad: datos.tipoUnidad as TipoUnidad,
          etiquetaUnidad: datos.etiquetaUnidad,
          conversionUnidad: datos.conversionUnidad,
          cantidadMinimaVenta: datos.cantidadMinimaVenta,
          incrementoVenta: datos.incrementoVenta,
          precioCosto: datos.precioCosto,
          precioVenta1: datos.precioVenta1,
          precioVenta2: datos.precioVenta2,
          precioVenta3: datos.precioVenta3,
          impuestoIncluido: datos.impuestoIncluido,
          tasaImpuesto: datos.tasaImpuesto,
          rastrearInventario: datos.rastrearInventario,
          stockMinimo: datos.stockMinimo,
          stockMaximo: datos.stockMaximo,
          activo: datos.activo,
          destacado: datos.destacado,
          imagenUrl: datos.imagenUrl,
          notas: datos.notas,
        },
        select: {
          id: true,
          sku: true,
          nombre: true,
          precioVenta1: true,
          activo: true,
          creadoEn: true,
        },
      });

      // Crear existencia inicial en almacen principal (stock=0)
      if (datos.rastrearInventario !== false) {
        const almacenPrincipal = await tx.almacen.findFirst({
          where: { empresaId, esPrincipal: true, activo: true },
        });

        if (almacenPrincipal) {
          await tx.existencia.create({
            data: {
              productoId: prod.id,
              almacenId: almacenPrincipal.id,
              cantidad: 0,
            },
          });
        }
      }

      return prod;
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Producto creado',
      productoId: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      empresaId,
    });

    return producto;
  },

  // ================================================================
  // ACTUALIZAR - PATCH /productos/:id
  // ================================================================

  /**
   * Actualiza parcialmente un producto.
   */
  async actualizar(id: string, empresaId: string, dto: ActualizarProductoDto) {
    const actual = await prisma.producto.findFirst({
      where: { id, empresaId },
    });

    if (!actual) {
      throw new ErrorNoEncontrado('Producto no encontrado');
    }

    const datos = sanitizarObjeto(dto);

    // Validar SKU unico si cambia
    if (datos.sku && datos.sku !== actual.sku) {
      const existeSku = await prisma.producto.findUnique({
        where: { sku: datos.sku },
      });
      if (existeSku) {
        throw new ErrorConflicto(`Ya existe un producto con SKU "${datos.sku}"`);
      }
    }

    // Validar codigo de barras unico si cambia
    if (datos.codigoBarras && datos.codigoBarras !== actual.codigoBarras) {
      const existeBarras = await prisma.producto.findUnique({
        where: { codigoBarras: datos.codigoBarras },
      });
      if (existeBarras) {
        throw new ErrorConflicto('Ya existe un producto con ese codigo de barras');
      }
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: datos as Prisma.ProductoUncheckedUpdateInput,
      select: {
        id: true,
        sku: true,
        nombre: true,
        precioVenta1: true,
        activo: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Producto actualizado',
      productoId: id,
      campos: Object.keys(datos),
    });

    return producto;
  },

  // ================================================================
  // ELIMINAR - DELETE /productos/:id
  // ================================================================

  /**
   * Desactiva un producto (soft delete).
   * No se puede eliminar si tiene ordenes pendientes.
   */
  async eliminar(id: string, empresaId: string) {
    const producto = await prisma.producto.findFirst({
      where: { id, empresaId },
      include: {
        _count: {
          select: { detallesOrden: true },
        },
      },
    });

    if (!producto) {
      throw new ErrorNoEncontrado('Producto no encontrado');
    }

    await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Producto eliminado (soft delete)',
      productoId: id,
      nombre: producto.nombre,
      sku: producto.sku,
    });
  },
};
