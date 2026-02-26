/**
 * src/compartido/respuesta.ts
 * ------------------------------------------------------------------
 * Formato unificado para todas las respuestas JSON de la API.
 * El frontend Angular depende de esta estructura exacta.
 *
 * Exito:  { exito: true,  datos: T,    mensaje: string, meta: MetaPaginacion | null }
 * Error:  { exito: false, datos: null, error: { mensaje, codigo, detalles } }
 *
 * Nunca retornar una respuesta fuera de este formato.
 * ------------------------------------------------------------------
 */

/**
 * Metadatos de paginacion incluidos en respuestas de listas.
 * Permite al frontend construir controles de paginacion sin calcular nada.
 */
export interface MetaPaginacion {
  /** Total de registros que cumplen el filtro */
  total: number;
  /** Pagina actual (1-indexed) */
  pagina: number;
  /** Registros por pagina */
  limite: number;
  /** Total de paginas calculado */
  totalPaginas: number;
  /** Si existe una pagina siguiente */
  tieneSiguiente: boolean;
  /** Si existe una pagina anterior */
  tieneAnterior: boolean;
}

/**
 * Clase estatica para construir respuestas HTTP estandarizadas.
 * Usar ApiResponse.ok() para exito y ApiResponse.fail() para errores.
 */
export class ApiResponse {
  /**
   * Respuesta exitosa.
   * @param datos - Payload de la respuesta (objeto, array, etc.)
   * @param mensaje - Mensaje descriptivo. Por defecto 'OK'.
   * @param meta - Metadatos de paginacion. Null si no aplica.
   */
  static ok<T>(datos: T, mensaje = 'OK', meta?: MetaPaginacion) {
    return { exito: true, datos, mensaje, meta: meta ?? null };
  }

  /**
   * Respuesta de error.
   * @param mensaje - Descripcion del error para el usuario.
   * @param codigo - Codigo de error interno (CONFLICT, NOT_FOUND, etc.)
   * @param detalles - Informacion adicional (errores de validacion Zod, etc.)
   */
  static fail(mensaje: string, codigo: string, detalles?: unknown) {
    return {
      exito: false,
      datos: null,
      error: { mensaje, codigo, detalles: detalles ?? null },
    };
  }
}
