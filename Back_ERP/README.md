# Back_ERP

Backend del ERP construido con Node 20, TypeScript, Express, Prisma y PostgreSQL.

## Estado

Este backend sigue una arquitectura modular por dominio:
- modulos/<modulo>/<modulo>.routes.ts
- modulos/<modulo>/<modulo>.controller.ts
- modulos/<modulo>/<modulo>.service.ts
- modulos/<modulo>/<modulo>.schema.ts

Las utilidades transversales viven en:
- src/config
- src/middlewares
- src/compartido

## Requisitos

- Node >= 20
- npm >= 10
- PostgreSQL
- Redis (opcional pero recomendado para rate limit distribuido)

## Inicio rapido

```bash
cp .env.example .env
npm ci
npm run db:generate
npm run dev
```

API local:
- http://localhost:3001

Health endpoints:
- /api/health
- /api/health/ready

## Scripts clave

Calidad y pruebas:

```bash
npm run typecheck
npm run test
npm run test:core
npm run test:security
npm run test:release
npm run ci
```

Operacion:

```bash
npm run quality:gate
npm run ops:smoke
npm run ops:backup
npm run ops:restore -- ./backups/ERP_db_YYYYMMDD_HHMMSS.sql.gz
```

## Deploy y rollback

Scripts disponibles en deploy/scripts:
- deploy_vps.sh
- rollback_vps.sh
- quality_gate.sh
- verify_architecture.sh
- post_deploy_smoke.sh
- backup_postgres.sh
- restore_postgres.sh

## Documentacion tecnica

Indice principal:
- docs/README.md

Documentos recomendados:
- docs/05_PRODUCCION_E_INFRAESTRUCTURA.md
- docs/06_MATRIZ_CONTRATOS_API_CORE.md
- docs/07_RUNBOOK_OPERACION_INCIDENTES.md

## Convenciones de seguridad

- Secretos solo por .env en servidor
- JWT_SECRET minimo 32 caracteres
- CORS_ORIGIN obligatorio en produccion
- No exponer PostgreSQL al host en produccion
