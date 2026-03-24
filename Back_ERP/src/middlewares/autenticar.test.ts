/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ErrorAcceso, ErrorNoAutorizado } from '../compartido/errores';

const mockPrisma = {
  sesion: {
    findUnique: jest.fn(),
  },
};

const jwtVerify = jest.fn();

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_SECRET_PREVIOUS: 'test-secret-previous',
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: (...args: any[]) => jwtVerify(...args),
  },
}));

import { autenticar } from './autenticar';

describe('middleware autenticar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza cuando no viene Authorization Bearer', async () => {
    const req = { headers: {} } as any;
    const next = jest.fn();

    await autenticar(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ErrorNoAutorizado);
    expect(error.message).toBe('Token requerido');
  });

  it('rechaza token invalido o expirado', async () => {
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();

    jwtVerify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await autenticar(req, {} as any, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ErrorNoAutorizado);
    expect(error.message).toContain('Token invalido o expirado');
  });

  it('rechaza sesion invalida o usuario inactivo', async () => {
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();

    jwtVerify.mockReturnValue({ sesionId: 'ses-1', usuarioId: 'u-1', empresaId: 'e-1', rol: 'ADMIN' });
    mockPrisma.sesion.findUnique.mockResolvedValue(null);

    await autenticar(req, {} as any, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ErrorNoAutorizado);
    expect(error.message).toBe('Sesion invalida o usuario inactivo');
  });

  it('rechaza por dia laboral no permitido para no-admin', async () => {
    const diaActual = new Date().getDay();
    const diaDistinto = (diaActual + 1) % 7;

    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();

    jwtVerify.mockReturnValue({ sesionId: 'ses-1', usuarioId: 'u-1', empresaId: 'e-1', rol: 'CAJERO' });
    mockPrisma.sesion.findUnique.mockResolvedValue({
      activo: true,
      usuario: {
        activo: true,
        rol: 'CAJERO',
        horarioInicio: '08:00',
        horarioFin: '18:00',
        diasLaborales: [diaDistinto],
      },
    });

    await autenticar(req, {} as any, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ErrorAcceso);
    expect(error.message).toContain('No tiene acceso en este dia');
  });

  it('rechaza por horario no permitido para no-admin', async () => {
    const diaActual = new Date().getDay();
    const hora = new Date().getHours();
    const inicio = `${String((hora + 1) % 24).padStart(2, '0')}:00`;
    const fin = `${String((hora + 2) % 24).padStart(2, '0')}:00`;

    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();

    jwtVerify.mockReturnValue({ sesionId: 'ses-1', usuarioId: 'u-1', empresaId: 'e-1', rol: 'CAJERO' });
    mockPrisma.sesion.findUnique.mockResolvedValue({
      activo: true,
      usuario: {
        activo: true,
        rol: 'CAJERO',
        horarioInicio: inicio,
        horarioFin: fin,
        diasLaborales: [diaActual],
      },
    });

    await autenticar(req, {} as any, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ErrorAcceso);
    expect(error.message).toContain('Acceso permitido de');
  });

  it('permite request valida y agrega req.user', async () => {
    const payload = { sesionId: 'ses-1', usuarioId: 'u-1', empresaId: 'e-1', rol: 'ADMIN' };
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();

    jwtVerify.mockReturnValue(payload);
    mockPrisma.sesion.findUnique.mockResolvedValue({
      activo: true,
      usuario: {
        activo: true,
        rol: 'ADMIN',
        horarioInicio: null,
        horarioFin: null,
        diasLaborales: [],
      },
    });

    await autenticar(req, {} as any, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('acepta token firmado con JWT_SECRET_PREVIOUS durante rotacion', async () => {
    const payload = { sesionId: 'ses-1', usuarioId: 'u-1', empresaId: 'e-1', rol: 'ADMIN' };
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();

    jwtVerify
      .mockImplementationOnce(() => {
        throw new Error('invalid with current secret');
      })
      .mockReturnValueOnce(payload);

    mockPrisma.sesion.findUnique.mockResolvedValue({
      activo: true,
      usuario: {
        activo: true,
        rol: 'ADMIN',
        horarioInicio: null,
        horarioFin: null,
        diasLaborales: [],
      },
    });

    await autenticar(req, {} as any, next);

    expect(jwtVerify).toHaveBeenCalledTimes(2);
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('propaga error inesperado de BD con next(error)', async () => {
    const payload = { sesionId: 'ses-1', usuarioId: 'u-1', empresaId: 'e-1', rol: 'ADMIN' };
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const next = jest.fn();
    const dbError = new Error('db connection lost');

    jwtVerify.mockReturnValue(payload);
    mockPrisma.sesion.findUnique.mockRejectedValue(dbError);

    await autenticar(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});
