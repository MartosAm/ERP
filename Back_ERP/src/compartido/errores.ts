/**
 * src/compartido/errores.ts
 * ------------------------------------------------------------------
 * Jerarquia de errores tipados para el sistema.
 * El middleware manejarErrores interpreta cada subclase para producir
 * la respuesta HTTP correcta con el codigo de estado apropiado.
 *
 * Uso en services: throw new ErrorNoEncontrado('Producto no encontrado');
 * Nunca hacer res.status() dentro de un service o controller catch.
 * ------------------------------------------------------------------
 */

/**
 * Clase base de errores de la aplicacion.
 * Todas las subclases heredan de aqui y son predecibles en el errorHandler.
 *
 * @param mensaje - Descripcion del error para el usuario
 * @param statusCode - Codigo HTTP (400, 401, 403, 404, 409, 422, 500)
 * @param codigo - Codigo interno de error (BAD_REQUEST, NOT_FOUND, etc.)
 * @param esOperacional - true si es un error esperado, false si es un bug
 */
export class AppError extends Error {
  constructor(
    public readonly mensaje: string,
    public readonly statusCode: number,
    public readonly codigo: string,
    public readonly esOperacional: boolean = true,
  ) {
    super(mensaje);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 - Datos de entrada invalidos o malformados */
export class ErrorPeticion extends AppError {
  constructor(m: string) {
    super(m, 400, 'BAD_REQUEST');
  }
}

/** 401 - Sin token, token invalido o sesion expirada */
export class ErrorNoAutorizado extends AppError {
  constructor(m = 'No autorizado') {
    super(m, 401, 'UNAUTHORIZED');
  }
}

/** 403 - Token valido pero rol insuficiente para la operacion */
export class ErrorAcceso extends AppError {
  constructor(m = 'Acceso denegado') {
    super(m, 403, 'FORBIDDEN');
  }
}

/** 404 - Recurso no encontrado en la base de datos */
export class ErrorNoEncontrado extends AppError {
  constructor(m: string) {
    super(m, 404, 'NOT_FOUND');
  }
}

/** 409 - Conflicto de unicidad (SKU, email, barcode duplicado) */
export class ErrorConflicto extends AppError {
  constructor(m: string) {
    super(m, 409, 'CONFLICT');
  }
}

/** 422 - Datos validos en formato pero invalidos segun logica de negocio */
export class ErrorNegocio extends AppError {
  constructor(m: string) {
    super(m, 422, 'UNPROCESSABLE');
  }
}
