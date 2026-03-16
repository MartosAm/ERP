# Deploy Backend ERP

Esta carpeta agrupa artefactos de despliegue del backend para VPS Ubuntu + Docker.

## Estructura
- `scripts/`: automatizacion de deploy, rollback y quality gate.
- `prometheus/`: configuracion y alertas base para monitoreo.

## Uso rapido
```bash
cd Back_ERP
./deploy/scripts/quality_gate.sh
./deploy/scripts/deploy_vps.sh
```

Rollback:
```bash
./deploy/scripts/rollback_vps.sh <commit_sha_estable>
```
