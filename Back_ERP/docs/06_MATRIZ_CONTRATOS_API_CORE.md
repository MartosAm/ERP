# Matriz de Contratos API Core

## Objetivo

Definir contratos minimos verificables para los modulos core del backend:
- Auth
- Ordenes
- Inventario
- Compras
- Entregas

Esta matriz sirve como base para regresion funcional en cada release candidata.

## Estandar de Respuesta

Contrato transversal esperado:
- Respuesta exitosa:
  - exito: true
  - datos: objeto o arreglo
- Respuesta con error:
  - exito: false
  - error.codigo: string de dominio
  - error.mensaje: texto legible

Codigos HTTP transversales:
- 200/201: operacion valida
- 400: payload invalido
- 401: sin autenticacion o token invalido
- 403: autenticado sin permisos
- 404: recurso no encontrado
- 409: conflicto de dominio o idempotencia
- 415: content-type invalido
- 429: rate limit excedido

## Auth

Endpoints criticos:
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- GET /api/v1/auth/me

Contrato minimo:
- login exitoso retorna token y datos de usuario/sesion.
- login fallido por credenciales invalidas retorna 401.
- logout invalida sesion activa y confirma exito.
- me requiere token valido y retorna contexto de usuario autenticado.

Cobertura automatizada asociada:
- src/modulos/auth/auth.routes.test.ts
- src/modulos/auth/auth.service.test.ts
- src/middlewares/autenticar.test.ts
- src/middlewares/limitarRates.test.ts

## Ordenes

Endpoints criticos:
- POST /api/v1/ordenes
- PATCH /api/v1/ordenes/:id/estado
- GET /api/v1/ordenes

Contrato minimo:
- crear orden valida inventario y reglas de negocio.
- cambios de estado respetan transiciones permitidas.
- listado mantiene filtros y paginacion consistentes.

Cobertura automatizada asociada:
- src/modulos/ordenes/ordenes.service.test.ts

## Inventario

Endpoints criticos:
- GET /api/v1/inventario
- POST /api/v1/inventario/ajustes

Contrato minimo:
- consultas respetan empresaId y filtros declarados.
- ajustes registran trazabilidad de movimiento.
- no se permiten saldos inconsistentes por reglas de negocio.

Cobertura automatizada asociada:
- src/modulos/inventario/inventario.service.test.ts
- src/modulos/inventario/inventario.schema.test.ts

## Compras

Endpoints criticos:
- POST /api/v1/compras
- GET /api/v1/compras

Contrato minimo:
- crear compra valida proveedor, items y totales.
- registrar compra impacta inventario de forma consistente.
- listado conserva contrato de paginacion y filtros.

Cobertura automatizada asociada:
- src/modulos/compras/compras.service.test.ts

## Entregas

Endpoints criticos:
- POST /api/v1/entregas
- PATCH /api/v1/entregas/:id/estado
- GET /api/v1/entregas

Contrato minimo:
- crear entrega valida relacion con orden y cliente.
- cambio de estado mantiene consistencia operativa.
- listado soporta filtros operativos sin romper contrato.

Cobertura automatizada asociada:
- src/modulos/entregas/entregas.service.test.ts
- src/modulos/entregas/entregas.schema.test.ts

## Ejecucion Recomendada por Release Candidata

Comandos:

```bash
npm run test:core
npm run test:security
npm run test:release
```

Regla de aprobacion:
- No-Go si cualquier comando falla.
- Go condicional si toda la bateria pasa y no hay cambios de contrato sin documentar.

## Control de Cambios de Contrato

Si un endpoint core cambia request o response:
1. Actualizar esta matriz en la misma rama.
2. Actualizar pruebas afectadas.
3. Registrar riesgo de compatibilidad en notas de release.
4. Validar consumidores frontend antes de merge.
