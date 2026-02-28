/**
 * core/services/api.service.ts
 * ------------------------------------------------------------------
 * Servicio HTTP base. Centraliza todas las llamadas al backend.
 * Usa HttpClient de Angular (NO axios) para aprovechar interceptors.
 * ------------------------------------------------------------------
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse, ApiPaginada } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** GET genérico */
  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http
      .get<ApiResponse<T>>(`${this.base}/${path}`, { params: httpParams })
      .pipe(map((r) => r.datos));
  }

  /** GET paginado */
  getPaginado<T>(path: string, params?: Record<string, string | number | boolean>): Observable<ApiPaginada<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<ApiPaginada<T>>(`${this.base}/${path}`, { params: httpParams });
  }

  /** POST genérico */
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map((r) => r.datos));
  }

  /** PUT genérico */
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map((r) => r.datos));
  }

  /** PATCH genérico */
  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map((r) => r.datos));
  }

  /** DELETE genérico */
  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(`${this.base}/${path}`)
      .pipe(map((r) => r.datos));
  }
}
