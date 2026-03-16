# Guia CI/CD y Rollback (ERP)

Fecha: 2026-03-16
Objetivo: formalizar Bloque 7 al 100% (pipeline automatico + rollback operativo).

---

## Pipeline automatico (GitHub Actions)

Archivo:
- `.github/workflows/ci.yml`

Jobs:
- `backend`: install, verify architecture, typecheck, tests, build.
- `frontend`: install, build de produccion.

Trigger:
- `push` y `pull_request` sobre `master`.

---

## Quality Gate local backend

Comando:

```bash
cd Back_ERP
npm run quality:gate
```

Incluye:
1. `verify:architecture`
2. `typecheck`
3. `test`
4. `build`

---

## Deploy VPS

Script:
- `Back_ERP/deploy/scripts/deploy_vps.sh`

Uso:

```bash
cd Back_ERP
./deploy/scripts/deploy_vps.sh
```

Requiere:
- `.env` presente (basado en `env.prod.template`).
- Docker compose productivo disponible.

---

## Rollback VPS

Script:
- `Back_ERP/deploy/scripts/rollback_vps.sh`

Uso:

```bash
cd Back_ERP
./deploy/scripts/rollback_vps.sh <commit_sha_estable>
```

Realiza:
1. checkout commit objetivo
2. rebuild stack prod
3. validacion de `/api/health`

---

## Criterio de cierre Bloque 7

- Pipeline CI configurado y versionado.
- Scripts de deploy y rollback funcionales.
- Evidencia de ejecucion local del quality gate.
- Documentacion operativa actualizada.
