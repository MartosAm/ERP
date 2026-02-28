/**
 * core/services/token.service.ts
 * ------------------------------------------------------------------
 * Almacenamiento seguro del JWT.
 *
 * Estrategia:
 *  - Token se guarda en MEMORIA (variable privada) para resistir XSS.
 *  - sessionStorage se usa SOLO como fallback para persistir tras F5
 *    (scoped a la pestaña, se borra al cerrar el navegador).
 *  - Decodifica el payload del JWT (sin librerías) para extraer
 *    exp, rol, sesionId, etc.
 *  - Expone estaExpirado() para verificar antes de cada request.
 * ------------------------------------------------------------------
 */
import { Injectable } from '@angular/core';
import type { Usuario } from '../models/api.model';

/** Payload mínimo que se espera dentro del JWT */
export interface JwtPayload {
  sub: string;
  rol: string;
  empresaId: string;
  sesionId: string;
  iat: number;
  exp: number;
}

const TOKEN_KEY = 'erp_tkn';
const USER_KEY = 'erp_usr';

/** Margen de seguridad: considerar expirado 60 s antes del exp real */
const MARGEN_EXPIRACION_S = 60;

@Injectable({ providedIn: 'root' })
export class TokenService {
  /**
   * Token en memoria — la fuente de verdad.
   * Si es null pero hay valor en sessionStorage, se rehidrata al llamar getToken().
   */
  private tokenEnMemoria: string | null = null;

  // ─── Token ──────────────────────────────────────────────────────

  /** Guarda el token en memoria y sessionStorage (fallback F5). */
  guardar(token: string, usuario: Usuario): void {
    this.tokenEnMemoria = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
    } catch {
      // Storage lleno o bloqueado (modo incógnito estricto) — solo memoria
    }
  }

  /** Obtiene el token vigente. Rehidrata desde sessionStorage si es necesario. */
  getToken(): string | null {
    if (this.tokenEnMemoria) return this.tokenEnMemoria;

    try {
      const almacenado = sessionStorage.getItem(TOKEN_KEY);
      if (almacenado) {
        this.tokenEnMemoria = almacenado;
        return almacenado;
      }
    } catch {
      // sessionStorage inaccesible
    }
    return null;
  }

  /** Limpia token de memoria y sessionStorage. */
  limpiar(): void {
    this.tokenEnMemoria = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      // silenciar
    }
  }

  // ─── Usuario ────────────────────────────────────────────────────

  /** Recupera el usuario serializado del sessionStorage. */
  getUsuarioGuardado(): Usuario | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as Usuario) : null;
    } catch {
      return null;
    }
  }

  // ─── Decodificación del JWT ─────────────────────────────────────

  /** Decodifica el payload del JWT sin validar firma (eso lo hace el backend). */
  decodificar(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;

      // Base64url → Base64 → string → JSON
      const base64 = partes[1]!.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  // ─── Expiración ─────────────────────────────────────────────────

  /** Retorna true si el token NO existe o ya expiró (con margen de 60 s). */
  estaExpirado(): boolean {
    const payload = this.decodificar();
    if (!payload?.exp) return true;

    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    return ahoraEnSegundos >= payload.exp - MARGEN_EXPIRACION_S;
  }

  /** Segundos restantes antes de la expiración. -1 si no hay token. */
  segundosRestantes(): number {
    const payload = this.decodificar();
    if (!payload?.exp) return -1;

    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - ahoraEnSegundos);
  }
}
