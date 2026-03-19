# Plan Critico y Pragmatico (Back + Front)

Fecha: 2026-03-18
Objetivo: asegurar que el ERP/POS funcione estable con usuarios reales, sin sobreingenieria.

---

## 1) Criterio de exito minimo

El sistema se considera "listo operativo" cuando:

- Backend responde estable bajo carga moderada (sin caidas, sin reinicios inesperados).
- Frontend carga rapido y mantiene flujo POS sin bloqueos.
- APIs criticas (auth, ordenes, inventario, entregas) no duplican operaciones ni pierden estado.
- Errores comunes de usuario/red no rompen proceso de venta o entrega.

---

## 2) Lo que ya esta bien (base solida)

- Middleware de seguridad y trazabilidad en backend.
- Rate limiting e idempotencia activos en operaciones mutables.
- Health checks y quality gate backend funcional.
- Frontend con interceptores de auth/error/idempotencia.
- Modelo de datos contempla reparto (rol REPARTIDOR y modulo entregas).

---

## 3) Faltantes criticos (solo lo necesario)

## P0 - Bloqueantes operativos (hacer primero)

1. Autorizacion estricta en cambio de estado de entregas.
- Riesgo: un usuario autenticado de la empresa podria alterar entregas que no le tocan.
- Minimo pragmatico:
  - ADMIN: puede actualizar cualquier entrega.
  - REPARTIDOR: solo entregas asignadas a su usuario.
  - Otros roles: sin permiso.
- Archivos objetivo:
  - `Back_ERP/src/modulos/entregas/entregas.routes.ts`
  - `Back_ERP/src/modulos/entregas/entregas.service.ts`

2. Cerrar auditoria de dependencias con vulnerabilidades altas.
- Riesgo: deuda tecnica de seguridad en produccion.
- Minimo pragmatico:
  - Aplicar fixes no disruptivos primero.
  - Si un fix es major y rompe, documentar excepcion temporal y fecha limite.
- Alcance:
  - `Back_ERP/package.json`
  - `Front_ERP-1/package.json`

3. Evitar cache riesgoso de API en PWA.
- Riesgo: datos desactualizados en POS/entregas y comportamiento inconsistente.
- Minimo pragmatico:
  - No cachear auth/ordenes/entregas con TTL largo.
  - Mantener cache solo para assets estaticos y, si aplica, endpoints de catalogo de baja volatilidad.
- Archivo objetivo:
  - `Front_ERP-1/ngsw-config.json`

## P1 - Estabilidad y rendimiento real (siguiente)

4. Quality gate tambien para frontend (minimo viable).
- Agregar scripts de validacion minima:
  - typecheck (si aplica por config Angular)
  - build production
  - test basico (smoke)
- Objetivo: prevenir regresiones antes de merge/deploy.

5. Lint real en backend y frontend (sin excesos).
- Hoy typecheck ya existe; falta lint de estilo/errores comunes reales.
- Minimo pragmatico: reglas basicas, sin imponer refactors masivos.

6. Prueba de carga corta y repetible para API critica.
- No benchmark complejo: solo smoke de concurrencia para detectar caidas.
- Objetivo concreto:
  - login
  - crear orden
  - actualizar entrega
  - validar que no haya 5xx y que latencia no se dispare.

---

## 4) Checklist de ejecucion rapida (1-3 dias)

Dia 1:
- [ ] Corregir permisos en entregas (P0.1).
- [ ] Ajustar `ngsw-config.json` para no cachear endpoints sensibles (P0.3).
- [ ] Re-ejecutar tests backend + build frontend.

Dia 2:
- [ ] Resolver vulnerabilities de bajo impacto de ruptura (P0.2).
- [ ] Documentar excepciones temporales de paquetes major si aplican.
- [ ] Agregar validacion minima frontend en pipeline.

Dia 3:
- [ ] Ejecutar prueba de carga corta repetible (P1.6).
- [ ] Corregir cuello de botella evidente (si aparece).
- [ ] Cerrar con checklist operativo y evidencia.

---

## 5) Definicion de "suficientemente robusto" (sin sobreingenieria)

- No hay endpoints criticos sin control de permisos.
- No hay duplicacion de operaciones de negocio en flujos de venta/entrega.
- No hay caidas en pruebas de concurrencia moderada.
- No hay vulnerabilidades altas sin plan fechado de mitigacion.
- Frontend y backend pasan sus validaciones minimas antes de despliegue.

---

## 6) Nota para POS en ruta (movil)

Para avanzar sin complejidad excesiva, el minimo funcional movil debe incluir:

- Vista de "mis entregas" estable para REPARTIDOR.
- Cambio de estado seguro con permisos correctos.
- Manejo de reconexion simple (reintento) en actualizacion de estado.
- Sincronizacion basica sin cache agresivo en endpoints de estado.

Eso permite operar en campo de forma integral sin entrar aun a arquitectura offline avanzada.
