/**
 * src/modulos/clientes/clientes.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de clientes.
 *
 * Reglas de negocio:
 * - Busqueda por nombre o telefono (para POS rapido)
 * - Control de credito: limiteCredito, creditoUtilizado, diasCredito
 * - No se puede eliminar un cliente con ordenes pendientes
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
  ErrorNegocio,
} from '../../compartido/errores';
import type {
  CrearClienteDto,
  ActualizarClienteDto,
  FiltroClientes,
} from './clientes.schema';

const CACHE_PREFIX = 'clientes';

export const ClientesService = {

  /**
   * Lista clientes con filtros, busqueda y paginacion.
   */
  async listar(empresaId: string, filtros: FiltroClientes) {
    const claveCache = `${CACHE_PREFIX}:${empresaId}:p${filtros.pagina}-l${filtros.limite}-b${filtros.buscar ?? ''}-a${filtros.activo ?? ''}-cr${filtros.conCredito ?? ''}`;
    const cacheado = cache.get<{ datos: unknown; meta: MetaPaginacion }>(claveCache);
    if (cacheado) return cacheado;

    const where: Record<string, unknown> = { empresaId };

    if (filtros.activo !== undefined) where.activo = filtros.activo;

    // Busqueda por nombre o telefono
    if (filtros.buscar) {
      where.OR = [
        { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
        { telefono: { contains: filtros.buscar } },
      ];
    }

    // Filtro de clientes con credito activo
    if (filtros.conCredito) {
      where.limiteCredito = { gt: 0 };
    }

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };
    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        ...paginar(parametros),
        select: {
          id: true,
          nombre: true,
          telefono: true,
          correo: true,
          direccion: true,
          rfc: true,
          activo: true,
          limiteCredito: true,
          creditoUtilizado: true,
          diasCredito: true,
          creadoEn: true,
          _count: { select: { ordenes: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.cliente.count({ where }),
    ]);

    const resultado = {
      datos: clientes,
      meta: construirMeta(total, parametros),
    };

    cache.set(claveCache, resultado, CacheTTL.CLIENTES);
    return resultado;
  },

  /**
   * Obtiene un cliente por ID con historial de ordenes.
   */
  async obtenerPorId(id: string, empresaId: string) {
    const cliente = await prisma.cliente.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        correo: true,
        direccion: true,
        rfc: true,
        notas: true,
        activo: true,
        limiteCredito: true,
        creditoUtilizado: true,
        diasCredito: true,
        creadoEn: true,
        actualizadoEn: true,
        _count: { select: { ordenes: true, entregas: true } },
      },
    });

    if (!cliente) {
      throw new ErrorNoEncontrado('Cliente no encontrado');
    }

    return cliente;
  },

  /**
   * Crea un nuevo cliente.
   */
  async crear(empresaId: string, dto: CrearClienteDto) {
    const datos = sanitizarObjeto(dto);

    const cliente = await prisma.cliente.create({
      data: {
        empresaId,
        ...datos,
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        correo: true,
        direccion: true,
        rfc: true,
        notas: true,
        activo: true,
        limiteCredito: true,
        diasCredito: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Cliente creado',
      clienteId: cliente.id,
      nombre: cliente.nombre,
      empresaId,
    });

    return cliente;
  },

  /**
   * Actualiza parcialmente un cliente.
   */
  async actualizar(id: string, empresaId: string, dto: ActualizarClienteDto) {
    const actual = await prisma.cliente.findFirst({
      where: { id, empresaId },
    });

    if (!actual) {
      throw new ErrorNoEncontrado('Cliente no encontrado');
    }

    const datos = sanitizarObjeto(dto);

    const cliente = await prisma.cliente.update({
      where: { id },
      data: datos,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        correo: true,
        direccion: true,
        rfc: true,
        notas: true,
        activo: true,
        limiteCredito: true,
        creditoUtilizado: true,
        diasCredito: true,
        creadoEn: true,
      },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Cliente actualizado',
      clienteId: id,
    });

    return cliente;
  },

  /**
   * Desactiva un cliente (soft delete).
   * No se puede eliminar si tiene credito pendiente.
   */
  async eliminar(id: string, empresaId: string) {
    const cliente = await prisma.cliente.findFirst({
      where: { id, empresaId },
    });

    if (!cliente) {
      throw new ErrorNoEncontrado('Cliente no encontrado');
    }

    // Verificar credito pendiente
    if (Number(cliente.creditoUtilizado) > 0) {
      throw new ErrorNegocio(
        `No se puede eliminar: tiene credito pendiente de $${cliente.creditoUtilizado}`,
      );
    }

    await prisma.cliente.update({
      where: { id },
      data: { activo: false },
    });

    invalidarCacheModulo(`${CACHE_PREFIX}:${empresaId}`);

    logger.info({
      mensaje: 'Cliente eliminado (soft delete)',
      clienteId: id,
      nombre: cliente.nombre,
    });
  },
};
