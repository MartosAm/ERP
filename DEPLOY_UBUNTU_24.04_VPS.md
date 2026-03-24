# Despliegue ERP en VPS Ubuntu 24.04

Guia operativa para desplegar backend y frontend en un VPS Ubuntu 24.04 de forma segura, con capacidad de rollback.

## 1) Objetivo de Arquitectura de Produccion

Arquitectura recomendada:
- Nginx publico (entrypoint 80/443).
- Frontend Angular servido como estatico.
- Backend API en contenedor interno.
- PostgreSQL y Redis en red privada Docker.

Resultado:
- Frontend y API bajo mismo dominio/origen.
- Frontend consume /api/v1 sin CORS complejo.

## 2) Requisitos Minimos del VPS

- Ubuntu 24.04 LTS.
- 2 vCPU, 4 GB RAM, 40 GB SSD (minimo sugerido).
- Dominio apuntando al VPS (A record).
- Usuario sudo no-root.

## 3) Preparacion Base del Servidor

Actualizar sistema:
- sudo apt update && sudo apt upgrade -y

Instalar utilidades:
- sudo apt install -y ca-certificates curl gnupg lsb-release git ufw

Firewall recomendado:
- sudo ufw default deny incoming
- sudo ufw default allow outgoing
- sudo ufw allow OpenSSH
- sudo ufw allow 80/tcp
- sudo ufw allow 443/tcp
- sudo ufw enable

## 4) Instalar Docker Engine + Compose Plugin

Pasos oficiales Docker para Ubuntu 24.04:
- Configurar repo de Docker.
- Instalar docker-ce, docker-ce-cli, containerd.io, docker-buildx-plugin, docker-compose-plugin.

Validar:
- docker --version
- docker compose version

Permisos usuario:
- sudo usermod -aG docker $USER
- Cerrar sesion y volver a entrar.

## 5) Clonar Repositorio y Preparar Entorno

Clonar:
- git clone <url-del-repo>
- cd ERP

### Backend
Ubicacion:
- Back_ERP

Crear .env de produccion:
- cp Back_ERP/env.prod.template Back_ERP/.env

Editar Back_ERP/.env y completar como minimo:
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET (>= 32 chars)
- CORS_ORIGIN (dominio real)
- METRICS_TOKEN (si METRICS_ENABLED=true)

Validaciones clave:
- NODE_ENV=production
- TRUST_PROXY=2
- CORS_ORIGIN no puede ser localhost en produccion.

## 6) Certificados TLS

El compose de backend monta:
- Back_ERP/nginx/certs/fullchain.pem
- Back_ERP/nginx/certs/privkey.pem

Opciones:
1. Let's Encrypt con certbot en host y copiar certs al path montado.
2. Caddy/Traefik como terminacion TLS (alternativa).

Sin certificados validos, Nginx TLS no levantara correctamente.

## 7) Despliegue Backend

Entrar:
- cd Back_ERP

Ejecutar quality gate:
- ./deploy/scripts/quality_gate.sh

Desplegar:
- ./deploy/scripts/deploy_vps.sh

Comprobaciones:
- docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
- curl -k https://tu-dominio/api/health
- curl -k https://tu-dominio/api/health/ready

Notas:
- El script de deploy espera health en /api/health.
- El contenedor API ejecuta prisma migrate deploy al iniciar.

## 8) Despliegue Frontend

Entrar:
- cd ../Front_ERP-1

Build local de control:
- npm ci
- npm run build

Despliegue por compose actual:
- docker compose up -d --build

Importante de integracion:
- Frontend prod usa apiUrl=/api/v1.
- Debe existir reverse proxy que rote /api hacia backend.
- Si frontend y backend se sirven por dominios distintos, hay que ajustar CORS y apiUrl.

## 9) Estrategia Recomendada de Enrutamiento (Simple y Robusta)

Opcion recomendada:
- Un solo Nginx publico (edge) con dos rutas:
  - / -> Frontend estatico
  - /api -> Backend API

Ventajas:
- Misma origin policy.
- Menor complejidad CORS.
- Menor friccion en seguridad de cookies/tokens.

## 10) Pruebas Post-Despliegue (Obligatorias)

Pruebas funcionales:
- Login correcto y login incorrecto.
- CRUD basico de catalogos.
- Flujo ordenes + inventario.

Pruebas de seguridad:
- 429 en intentos masivos de login.
- 401 con token invalido.
- 403 con rol incorrecto.
- 415 con Content-Type invalido.

Pruebas operativas:
- Reinicio de contenedores sin caida prolongada.
- Health y readiness estables durante 10 minutos.

## 11) Monitoreo y Alertas

Backend incluye:
- /api/metrics (con token opcional + restricciones de red).
- Configuracion de Prometheus en Back_ERP/deploy/prometheus.

Recomendado:
- Levantar Prometheus y alertas basicas de:
  - Caida de health.
  - Latencia alta sostenida.
  - Errores 5xx.
  - Saturacion de CPU/RAM.

## 12) Backups y Recuperacion

Base de datos:
- Programar pg_dump diario (cron/systemd timer).
- Retencion: 7 diarios + 4 semanales (minimo).
- Probar restauracion en entorno alterno cada semana.

Rollback de app:
- cd Back_ERP
- ./deploy/scripts/rollback_vps.sh <commit_sha_estable>

Importante:
- Validar health despues de rollback.
- Evitar rollback de esquema no compatible sin plan de migracion inversa.

## 13) Checklist Final de Produccion

- [ ] .env configurado con secretos fuertes
- [ ] CORS_ORIGIN en dominio real
- [ ] Certificados TLS activos
- [ ] docker compose prod levantado y healthy
- [ ] Frontend sirviendo y consumiendo /api/v1 correctamente
- [ ] Quality gate ejecutado
- [ ] Pruebas funcionales y de seguridad en verde
- [ ] Backup y restore probados
- [ ] Runbook de rollback validado

## 14) Riesgos Conocidos y Mitigaciones

1. Inconsistencia de Node en frontend (Dockerfile Node 18 vs CI Node 20).
- Mitigacion: alinear Dockerfile frontend a Node 20.

2. Documentacion antigua en README de modulos.
- Mitigacion: actualizar README internos con arquitectura vigente.

3. Dependencia de certs en filesystem para Nginx backend.
- Mitigacion: automatizar provision TLS (certbot o proxy edge administrado).

Con este procedimiento, el despliegue en Ubuntu 24.04 queda controlado, reproducible y con ruta de recuperacion.
