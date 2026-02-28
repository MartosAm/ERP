/**
 * src/modulos/entregas/entregas.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio del modulo de entregas / delivery.
 *
 * Reglas:
 * - Solo ordenes COMPLETADA pueden tener entrega
 * - Una orden solo puede tener una entrega (relacion 1:1)
 * - Transicion de estados valida:
 *     ASIGNADO -> EN_RUTA -> ENTREGADO | NO_ENTREGADO | REPROGRAMADO
 * - REPROGRAMADO -> ASIGNADO (ciclo para reintentar)
 * - Solo ADMIN puede crear entregas, REPARTIDOR puede actualizar estado
 * ------------------------------------------------------------------
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo } from '../../config/cache';
import { paginar, construirMeta } from '../../compartido/paginacion';
import {
  ErrorNoEncontrado,
  ErrorNegocio,
  ErrorConflicto,
} from '../../compartido/errores';
import { logger } from '../../compartido/logger';
import type { CrearEntregaDto, ActualizarEstadoDto, FiltroEntregasDto } from './entregas.schema';

const MODULO = 'ENTREGAS';

/** Transiciones de estado validas */
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  ASIGNADO: ['EN_RUTA'],
  EN_RUTA: ['ENTREGADO', 'NO_ENTREGADO', 'REPROGRAMADO'],
  REPROGRAMADO: ['ASIGNADO', 'EN_RUTA'],
};

export const EntregasService = {

  /**
   * Crea una entrega para una orden completada.
   */
  async crear(dto: CrearEntregaDto, empresaId: string) {
    // Verificar que la orden existe y esta completada
    const orden = await prisma.orden.findFirst({
      where: { id: dto.ordenId, empresaId },
    });

    if (!orden) {
      throw new ErrorNoEncontrado('Orden no encontrada');
    }

    if (orden.estado !== 'COMPLETADA') {
      throw new ErrorNegocio('Solo se pueden asignar entregas a ordenes completadas');
    }

    // Verificar que no tenga entrega ya asignada
    const entregaExistente = await prisma.entrega.findUnique({
      where: { ordenId: dto.ordenId },
    });

    if (entregaExistente) {
      throw new ErrorConflicto('Esta orden ya tiene una entrega asignada');
    }

    // Verificar repartidor si se asigna
    if (dto.asignadoAId) {
      const repartidor = await prisma.usuario.findFirst({
        where: { id: dto.asignadoAId, rol: 'REPARTIDOR', activo: true },
      });

      if (!repartidor) {
        throw new ErrorNoEncontrado('Repartidor no encontrado o no tiene rol REPARTIDOR');
      }
    }

    const entrega = await prisma.entrega.create({
      data: {
        ordenId: dto.ordenId,
        clienteId: orden.clienteId,
        asignadoAId: dto.asignadoAId ?? null,
        direccionEntrega: dto.direccionEntrega,
        programadaEn: dto.programadaEn ? new Date(dto.programadaEn) : null,
        notas: dto.notas ?? null,
      },
      include: {
        orden: { select: { id: true, numeroOrden: true, total: true } },
        cliente: { select: { id: true, nombre: true, telefono: true } },
        asignadoA: { select: { id: true, nombre: true } },
      },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Entrega creada',
      entregaId: entrega.id,
      ordenId: dto.ordenId,
      repartidor: dto.asignadoAId ?? 'sin asignar',
    });

    return entrega;
  },

  /**
   * Actualiza el estado de una entrega con validacion de transiciones.
   */
  async actualizarEstado(entregaId: string, dto: ActualizarEstadoDto, empresaId: string) {
    const entrega = await prisma.entrega.findFirst({
      where: { id: entregaId, orden: { empresaId } },
    });

    if (!entrega) {
      throw new ErrorNoEncontrado('Entrega no encontrada');
    }

    // Validar transicion de estado
    const transicionesPermitidas = TRANSICIONES_VALIDAS[entrega.estado] ?? [];
    if (!transicionesPermitidas.includes(dto.estado)) {
      throw new ErrorNegocio(
        `No se puede cambiar de ${entrega.estado} a ${dto.estado}. Transiciones permitidas: ${transicionesPermitidas.join(', ')}`,
      );
    }

    // Validar motivo de fallo
    if (dto.estado === 'NO_ENTREGADO' && !dto.motivoFallo) {
      throw new ErrorNegocio('Se requiere motivo cuando la entrega no fue completada');
    }

    // Validar fecha de reprogramacion
    if (dto.estado === 'REPROGRAMADO' && !dto.programadaEn) {
      throw new ErrorNegocio('Se requiere nueva fecha para reprogramar la entrega');
    }

    const dataActualizacion: any = {
      estado: dto.estado,
      notas: dto.notas ?? entrega.notas,
    };

    if (dto.estado === 'ENTREGADO') {
      dataActualizacion.entregadaEn = new Date();
    }

    if (dto.estado === 'NO_ENTREGADO') {
      dataActualizacion.motivoFallo = dto.motivoFallo;
    }

    if (dto.estado === 'REPROGRAMADO') {
      dataActualizacion.programadaEn = new Date(dto.programadaEn!);
    }

    const entregaActualizada = await prisma.entrega.update({
      where: { id: entregaId },
      data: dataActualizacion,
      include: {
        orden: { select: { id: true, numeroOrden: true } },
        asignadoA: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true, telefono: true } },
      },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: `Entrega ${dto.estado.toLowerCase()}`,
      entregaId,
      estadoAnterior: entrega.estado,
      estadoNuevo: dto.estado,
    });

    return entregaActualizada;
  },

  /**
   * Obtiene una entrega por ID.
   */
  async obtenerPorId(entregaId: string, empresaId: string) {
    const entrega = await prisma.entrega.findFirst({
      where: { id: entregaId, orden: { empresaId } },
      include: {
        orden: {
          select: { id: true, numeroOrden: true, total: true, estado: true },
        },
        cliente: { select: { id: true, nombre: true, telefono: true, direccion: true } },
        asignadoA: { select: { id: true, nombre: true } },
      },
    });

    if (!entrega) {
      throw new ErrorNoEncontrado('Entrega no encontrada');
    }

    return entrega;
  },

  /**
   * Lista entregas con filtros y paginacion.
   */
  async listar(filtros: FiltroEntregasDto, empresaId: string) {
    const cacheKey = `${MODULO}:listar:${empresaId}:${JSON.stringify(filtros)}`;
    const cached = cache.get<{ datos: unknown; meta: unknown }>(cacheKey);
    if (cached) return cached;

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };

    const where: Prisma.EntregaWhereInput = {
      orden: { empresaId },
    };

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    if (filtros.asignadoAId) {
      where.asignadoAId = filtros.asignadoAId;
    }

    if (filtros.pendientes === 'true') {
      where.estado = { in: ['ASIGNADO', 'EN_RUTA', 'REPROGRAMADO'] };
    }

    const [datos, total] = await Promise.all([
      prisma.entrega.findMany({
        where,
        ...paginar(parametros),
        orderBy: { creadoEn: 'desc' },
        include: {
          orden: { select: { id: true, numeroOrden: true, total: true } },
          cliente: { select: { id: true, nombre: true } },
          asignadoA: { select: { id: true, nombre: true } },
        },
      }),
      prisma.entrega.count({ where }),
    ]);

    const meta = construirMeta(total, parametros);
    const resultado = { datos, meta };

    cache.set(cacheKey, resultado, CacheTTL.PRODUCTOS);
    return resultado;
  },

  /**
   * Lista entregas asignadas al repartidor actual (para app de repartidor).
   */
  async misEntregas(repartidorId: string) {
    const entregas = await prisma.entrega.findMany({
      where: {
        asignadoAId: repartidorId,
        estado: { in: ['ASIGNADO', 'EN_RUTA', 'REPROGRAMADO'] },
      },
      orderBy: [
        { programadaEn: 'asc' },
        { creadoEn: 'asc' },
      ],
      include: {
        orden: { select: { id: true, numeroOrden: true, total: true } },
        cliente: { select: { id: true, nombre: true, telefono: true, direccion: true } },
      },
    });

    return entregas;
  },
};
