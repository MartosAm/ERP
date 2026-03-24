/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('./env', () => ({
  env: {
    METRICS_ENABLED: true,
    METRICS_TOKEN: 'token-actual-123456',
    METRICS_TOKEN_PREVIOUS: 'token-previo-123456',
  },
}));

import { autorizarMetricas } from './metrics';

describe('autorizarMetricas', () => {
  it('permite acceso con token actual', () => {
    const req = {
      header: (name: string) => (name === 'authorization' ? 'Bearer token-actual-123456' : ''),
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    autorizarMetricas(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('permite acceso con token previo durante rotacion', () => {
    const req = {
      header: (name: string) => (name === 'authorization' ? 'Bearer token-previo-123456' : ''),
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    autorizarMetricas(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza token invalido', () => {
    const req = {
      header: (name: string) => (name === 'authorization' ? 'Bearer token-no-valido' : ''),
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    autorizarMetricas(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
