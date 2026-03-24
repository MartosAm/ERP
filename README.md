# ERP Monorepo - Plan Maestro de Validacion Funcional y Seguridad

Este documento define la estrategia para confirmar si el proyecto ERP esta listo para uso real sin fallos en API, middlewares y seguridad.

Alcance analizado:
- Back_ERP (Node.js + Express + Prisma + PostgreSQL + Redis)
- Front_ERP-1 (Angular + Tailwind + Angular Material + Nginx)
- Docker Compose, Nginx reverse proxy, CI y scripts de despliegue

## 1) Estado Actual Tecnico (Basado en Codigo)

### Backend
- Runtime objetivo: Node.js 20+.
- API: Express con TypeScript estricto.
- ORM: Prisma + PostgreSQL.
- Seguridad activa:
  - Helmet + CSP + HSTS + headers duros.
  - CORS validado por entorno.
  - Sanitizacion global de body contra XSS.
  - Validacion Zod en DTOs.
  - JWT con verificacion de sesion activa en BD.
  - Control de roles por middleware.
  - Rate limiting general y por endpoints criticos.
  - Idempotencia para operaciones mutables sensibles.
- Observabilidad:
  - Endpoint de metricas opcional.
  - Health y readiness checks.
  - Logging estructurado.

### Frontend
- Framework: Angular 19.
- Build prod con service worker habilitado.
- Interceptores de auth, idempotencia y errores.
- Token en memoria + sessionStorage (fallback).
- API URL:
  - Dev: http://localhost:3001/api/v1
  - Prod: /api/v1 (espera reverse proxy mismo dominio)

### Infra y DevOps
- Existe pipeline CI en GitHub Actions para backend y frontend.
- Existe stack de produccion para backend con docker-compose.prod.yml.
- Existen scripts de quality gate, deploy y rollback.

## 2) Brechas Detectadas (Antes de Declarar "Listo para Produccion")

1. Documentacion desactualizada en algunos README internos.
- Hay referencias antiguas de estructura y stack en README de backend y frontend.
- Riesgo: onboarding confuso y errores de operacion.

2. Frontend Dockerfile usa Node 18 y CI usa Node 20.
- No bloquea necesariamente, pero genera inconsistencia de build.
- Recomendacion: unificar a Node 20 en todos los entornos.

3. Certificados TLS no versionados.
- docker-compose.prod.yml monta Back_ERP/nginx/certs.
- Si no se provisionan certs en VPS, Nginx TLS no levanta correctamente.

4. Integracion Front+Back en produccion requiere proxy unificado.
- Front prod llama /api/v1 (ruta relativa).
- Necesita Nginx frontal que rote /api a backend (mismo host/origen).

5. Evidencia de ejecucion CI local no capturada en esta sesion.
- El IDE devolvio buffer alterno en terminal para npm run ci.
- No hay errores reportados por diagnostico del workspace, pero falta acta formal de salida de CI local.

## 3) Estrategia de Validacion para Declarar "Funcional y Seguro"

Se usara un enfoque de Quality Gate por capas. El proyecto solo pasa cuando cumple todos los puntos de cada fase.

### Fase A - Integridad de Build y Tipado
Objetivo: garantizar que compila limpio en entorno limpio.

Checklist:
- Backend:
  - npm ci
  - npm run typecheck
  - npm run build
- Frontend:
  - npm ci
  - npm run typecheck
  - npm run build

Criterio de aprobacion:
- 0 errores de TypeScript.
- 0 fallos de build.

### Fase B - Pruebas de Dominio y API
Objetivo: validar reglas de negocio y contratos API.

Checklist:
- Backend:
  - npm test -- --runInBand
  - Ejecutar test-flujo-completo.sh con base de datos de pruebas.
- HTTP manuales:
  - Ejecutar colecciones .http por modulo en Back_ERP/http.

Criterio de aprobacion:
- 100% tests backend en verde.
- Flujo E2E de negocio en verde.
- Sin regresiones de contratos en endpoints criticos: auth, inventario, ordenes, compras, entregas.

### Fase C - Seguridad Aplicativa
Objetivo: verificar middleware y postura de seguridad en ejecucion real.

Checklist:
- Confirmar en runtime headers de seguridad:
  - HSTS
  - CSP
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
- Validar escenarios de seguridad:
  - Login force brute throttled (429).
  - Token invalido/expirado (401).
  - Rol insuficiente (403).
  - Content-Type invalido (415).
  - Payload excesivo (413).
  - Reuso de idempotency key con payload distinto (409).
- Validar CORS en produccion:
  - CORS_ORIGIN real, sin localhost.

Criterio de aprobacion:
- Todos los controles anteriores funcionan y devuelven codigos esperados.

### Fase D - Operacion y Observabilidad
Objetivo: asegurar operacion estable en VPS.

Checklist:
- Endpoints:
  - /api/health responde 200.
  - /api/health/ready responde 200 con BD disponible.
- Metricas:
  - /api/metrics habilitado segun politica, protegido por token y red.
- Logs:
  - Request ID presente y trazable en incidentes.
- Graceful shutdown:
  - Reinicio de contenedor sin corrupcion de estado.

Criterio de aprobacion:
- Servicio estable despues de reinicios y health checks continuos.

### Fase E - Hardening de Despliegue
Objetivo: cerrar huecos de infraestructura y secretos.

Checklist:
- Secretos fuera de git (solo .env en servidor).
- TLS con cert valido (Let's Encrypt o equivalente).
- Backups de PostgreSQL y prueba de restauracion.
- Firewall VPS (ufw) y puertos minimos expuestos.
- Usuario no-root para contenedores de app.

Criterio de aprobacion:
- Checklist de hardening completado y validado con evidencia.

## 4) Matriz de Go/No-Go para Salida a Produccion

Go (permitido desplegar):
- Build y tests en verde.
- Seguridad funcional validada.
- Infra con TLS y backups activos.
- Endpoints health/ready estables.
- Rollback probado.

No-Go (bloquear salida):
- Fallo en compilacion o tests.
- CORS en localhost en produccion.
- Sin certificado TLS en entorno publico.
- Sin prueba de rollback.
- Sin evidencia de backups y restauracion.

## 5) Plan de Accion Inmediato Recomendado

1. Unificar Node 20 en Dockerfile del frontend.
2. Actualizar README de backend y frontend para reflejar arquitectura real.
3. Ejecutar quality gate backend y CI frontend en runner limpio (registrar salida).
4. Definir estrategia unica de reverse proxy Front+Back en el VPS.
5. Provisionar TLS y validar ruta completa con dominio real.

## 6) Resultado Esperado

Con esta estrategia, el proyecto podra certificarse como:
- Funcional (sin fallos criticos de API y negocio).
- Seguro (middleware y controles comprobados).
- Desplegable (operacion estable en Ubuntu 24.04 sobre VPS).

Siguiente documento obligatorio: DEPLOY_UBUNTU_24.04_VPS.md
