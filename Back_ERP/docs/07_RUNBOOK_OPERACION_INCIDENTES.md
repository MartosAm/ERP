# Runbook de Operacion e Incidentes

## Objetivo

Estandarizar respuesta ante incidentes en produccion para reducir tiempo de recuperacion y evitar acciones destructivas sin evidencia.

## Alcance

Este runbook aplica al stack backend en VPS:
- postgres
- redis
- api
- nginx

## Comandos Base

Desde Back_ERP:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 nginx
bash ./deploy/scripts/post_deploy_smoke.sh http://localhost
```

## Triage Inicial (primeros 5 minutos)

1. Confirmar estado de servicios:
   - docker compose ... ps
2. Validar salud API:
   - curl -fsS http://localhost/api/health
   - curl -fsS http://localhost/api/health/ready
3. Ejecutar smoke test:
   - bash ./deploy/scripts/post_deploy_smoke.sh http://localhost
4. Revisar logs de api/nginx para identificar tipo de falla.

## Playbook 1: API no responde

Sintoma:
- health o readiness fallan

Acciones:
1. Revisar logs API.
2. Validar conexion a postgres y redis via healthchecks de compose.
3. Reiniciar servicio API:
   - docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api
4. Revalidar:
   - smoke test

Escalacion:
- Si no recupera en 10 min, aplicar rollback.

## Playbook 2: Error de despliegue

Sintoma:
- deploy completo pero smoke test falla

Acciones:
1. Congelar nuevos despliegues.
2. Identificar ultimo commit estable.
3. Ejecutar rollback:
   - bash ./deploy/scripts/rollback_vps.sh <commit_sha>
4. Confirmar salud:
   - bash ./deploy/scripts/post_deploy_smoke.sh http://localhost

## Playbook 3: Degradacion de base de datos

Sintoma:
- readiness falla por BD
- errores de conexion o timeout en logs

Acciones:
1. Verificar estado postgres:
   - docker compose ... ps
   - docker compose ... logs --tail=200 postgres
2. Tomar backup inmediato antes de cambios mayores:
   - BACKUP_DIR=./backups npm run ops:backup
3. Si hay corrupcion o perdida logica, restaurar backup validado:
   - npm run ops:restore -- ./backups/<archivo.sql.gz>
4. Revalidar:
   - health, readiness y smoke test

## Politica de Backup y Restore

Frecuencia sugerida:
- Diario fuera de hora pico.

Comandos:

```bash
BACKUP_DIR=./backups npm run ops:backup
npm run ops:restore -- ./backups/ERP_db_YYYYMMDD_HHMMSS.sql.gz
```

Verificacion minima posterior a restore:
1. health 200
2. readiness 200
3. smoke test OK
4. prueba funcional de login y consulta de modulo core

## Criterio de Cierre de Incidente

Un incidente se considera cerrado solo si:
- servicios en estado healthy
- smoke test en verde
- causa raiz documentada
- accion preventiva definida
