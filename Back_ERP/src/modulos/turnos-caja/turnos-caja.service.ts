/**
 * src/modulos/turnos-caja/turnos-caja.service.ts
 * ------------------------------------------------------------------
 * Logica de negocio para turnos de caja.
 *
 * Reglas:
 * - Solo puede haber UN turno abierto por caja a la vez
 * - Solo el usuario que abrio el turno puede cerrarlo (o ADMIN)
 * - Al cerrar, el sistema calcula monto esperado vs contado -> diferencia
 * - Los turnos no se eliminan (auditoria)
 * ------------------------------------------------------------------
 */

import { prisma } from '../../config/database';
import { cache, CacheTTL, invalidarCacheModulo } from '../../config/cache';
import { paginar, construirMeta } from '../../compartido/paginacion';
import { ErrorNoEncontrado, ErrorNegocio, ErrorConflicto } from '../../compartido/errores';
import { logger } from '../../compartido/logger';
import type { AbrirTurnoDto, CerrarTurnoDto, FiltroTurnosDto } from './turnos-caja.schema';

const MODULO = 'TURNOS_CAJA';

export const TurnosCajaService = {

  /**
   * Abre un nuevo turno de caja.
   * Verifica que no haya otro turno abierto en la misma caja.
   */
  async abrir(dto: AbrirTurnoDto, usuarioId: string, empresaId: string) {
    // Verificar que la caja existe y pertenece a la empresa
    const caja = await prisma.cajaRegistradora.findFirst({
      where: { id: dto.cajaRegistradoraId, empresaId, activo: true },
    });

    if (!caja) {
      throw new ErrorNoEncontrado('Caja registradora no encontrada');
    }

    // Verificar que no haya turno abierto en esta caja
    const turnoAbierto = await prisma.turnoCaja.findFirst({
      where: {
        cajaRegistradoraId: dto.cajaRegistradoraId,
        cerradaEn: null,
      },
    });

    if (turnoAbierto) {
      throw new ErrorConflicto(
        `La caja "${caja.nombre}" ya tiene un turno abierto por otro usuario`,
      );
    }

    // Verificar que el usuario no tenga otro turno abierto en otra caja
    const turnoUsuario = await prisma.turnoCaja.findFirst({
      where: {
        usuarioId,
        cerradaEn: null,
      },
    });

    if (turnoUsuario) {
      throw new ErrorConflicto('Ya tienes un turno abierto en otra caja. Cierralo primero.');
    }

    const turno = await prisma.turnoCaja.create({
      data: {
        cajaRegistradoraId: dto.cajaRegistradoraId,
        usuarioId,
        montoApertura: dto.montoApertura,
        notas: dto.notas ?? null,
      },
      include: {
        cajaRegistradora: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Turno de caja abierto',
      turnoId: turno.id,
      caja: caja.nombre,
      usuarioId,
      montoApertura: dto.montoApertura,
    });

    return turno;
  },

  /**
   * Cierra un turno de caja abierto.
   * Calcula monto esperado sumando el fondo + pagos en efectivo del turno.
   * Registra la diferencia (sobrante/faltante).
   */
  async cerrar(turnoId: string, dto: CerrarTurnoDto, usuarioId: string, rol: string) {
    const turno = await prisma.turnoCaja.findUnique({
      where: { id: turnoId },
      include: {
        ordenes: {
          where: { pagado: true },
          select: { total: true, cambio: true, metodoPago: true },
        },
      },
    });

    if (!turno) {
      throw new ErrorNoEncontrado('Turno de caja no encontrado');
    }

    if (turno.cerradaEn) {
      throw new ErrorNegocio('Este turno ya fue cerrado');
    }

    // Solo el usuario que abrio o un ADMIN puede cerrar
    if (turno.usuarioId !== usuarioId && rol !== 'ADMIN') {
      throw new ErrorNegocio('Solo puedes cerrar tu propio turno o ser ADMIN');
    }

    // Calcular monto esperado: apertura + ventas en efectivo - cambio dado
    const ventasEfectivo = turno.ordenes
      .filter((o) => o.metodoPago === 'EFECTIVO' || o.metodoPago === 'MIXTO')
      .reduce((sum, o) => sum + Number(o.total) - Number(o.cambio), 0);

    const montoEsperado = Number(turno.montoApertura) + ventasEfectivo;
    const diferencia = dto.montoCierre - montoEsperado;

    const turnoCerrado = await prisma.turnoCaja.update({
      where: { id: turnoId },
      data: {
        montoCierre: dto.montoCierre,
        montoEsperado,
        diferencia,
        cerradaEn: new Date(),
        notas: dto.notas ? `${turno.notas ?? ''}\nCierre: ${dto.notas}` : turno.notas,
      },
      include: {
        cajaRegistradora: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    invalidarCacheModulo(MODULO);

    logger.info({
      mensaje: 'Turno de caja cerrado',
      turnoId,
      montoEsperado,
      montoCierre: dto.montoCierre,
      diferencia,
    });

    return turnoCerrado;
  },

  /**
   * Obtiene el turno activo del usuario (si tiene uno abierto).
   */
  async obtenerTurnoActivo(usuarioId: string) {
    const turno = await prisma.turnoCaja.findFirst({
      where: {
        usuarioId,
        cerradaEn: null,
      },
      include: {
        cajaRegistradora: { select: { id: true, nombre: true } },
        _count: { select: { ordenes: true } },
      },
    });

    return turno;
  },

  /**
   * Obtener turno por ID con detalles.
   */
  async obtenerPorId(turnoId: string) {
    const turno = await prisma.turnoCaja.findUnique({
      where: { id: turnoId },
      include: {
        cajaRegistradora: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        _count: { select: { ordenes: true } },
      },
    });

    if (!turno) {
      throw new ErrorNoEncontrado('Turno de caja no encontrado');
    }

    return turno;
  },

  /**
   * Lista turnos de caja con filtros y paginacion.
   */
  async listar(filtros: FiltroTurnosDto, empresaId: string) {
    const cacheKey = `${MODULO}:listar:${empresaId}:${JSON.stringify(filtros)}`;
    const cached = cache.get<{ datos: unknown; meta: unknown }>(cacheKey);
    if (cached) return cached;

    const parametros = { pagina: filtros.pagina, limite: filtros.limite };

    const where: Record<string, unknown> = {
      cajaRegistradora: { empresaId },
    };

    if (filtros.cajaRegistradoraId) {
      where.cajaRegistradoraId = filtros.cajaRegistradoraId;
    }

    if (filtros.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }

    if (filtros.abierto === 'true') {
      where.cerradaEn = null;
    } else if (filtros.abierto === 'false') {
      where.cerradaEn = { not: null };
    }

    const [datos, total] = await Promise.all([
      prisma.turnoCaja.findMany({
        where,
        ...paginar(parametros),
        orderBy: { abiertaEn: 'desc' },
        include: {
          cajaRegistradora: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          _count: { select: { ordenes: true } },
        },
      }),
      prisma.turnoCaja.count({ where }),
    ]);

    const meta = construirMeta(total, parametros);
    const resultado = { datos, meta };

    cache.set(cacheKey, resultado, CacheTTL.ALMACENES); // 600s
    return resultado;
  },
};
