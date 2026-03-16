# Guia de Despliegue VPS Ubuntu con Docker (Backend ERP)

Fecha: 2026-03-16
Objetivo: desplegar Backend ERP en VPS Ubuntu usando Docker Compose con PostgreSQL, Redis y Nginx.

---

## 1. Preparar VPS Ubuntu

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release git ufw
```

### Docker Engine + Compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### Firewall recomendado

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 2. Clonar proyecto y preparar entorno

```bash
cd /opt
sudo git clone <TU_REPO_GIT> erp
sudo chown -R $USER:$USER /opt/erp
cd /opt/erp/Back_ERP
```

Crear archivo de entorno de produccion:

```bash
cp .env.prod.example .env
nano .env
```

Variables minimas obligatorias:
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN`

---

## 3. Levantar stack de produccion

```bash
cd /opt/erp/Back_ERP
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Verificar estado:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
```

Verificar health:

```bash
curl -I http://localhost/api/health
curl -I http://localhost/api/health/ready
```

---

## 4. SSL en Nginx (produccion)

La configuracion base ya expone 80/443. Para HTTPS real:

1. Colocar certificados en:
- `Back_ERP/nginx/certs/fullchain.pem`
- `Back_ERP/nginx/certs/privkey.pem`

2. Activar bloque SSL en `Back_ERP/nginx/nginx.conf` (descomentar seccion TLS).

Nota: el `docker-compose.prod.yml` ya usa `Back_ERP/nginx/nginx.prod.conf`
con HTTPS activo por defecto (redireccion 80 -> 443).

3. Reiniciar Nginx:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

Recomendacion: usar Certbot en host y montar certificados dentro del contenedor.

---

## 5. Redis e idempotencia distribuida

Estado actual implementado:
- Rate limiting distribuido con Redis (fallback a memoria si Redis no esta disponible).
- Idempotencia backend ya preparada para usar Redis cuando `REDIS_URL` esta configurada y conectada.

Verificacion Redis:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec redis redis-cli ping
```

Debe responder `PONG`.

---

## 6. Operacion diaria

### Ver logs

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f nginx
```

### Reiniciar servicios

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

### Actualizar version

```bash
cd /opt/erp
git pull
cd Back_ERP
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 7. Checklist de salida a produccion

- [ ] `docker compose ps` sin contenedores caidos
- [ ] `/api/health` y `/api/health/ready` responden 200
- [ ] `REDIS_URL` configurada y `PONG` en Redis
- [ ] `JWT_SECRET` robusto y CORS correcto
- [ ] HTTPS activo con certificado valido
- [ ] Logs sin errores repetitivos en arranque

---

## 8. Rollback rapido

Si una actualizacion falla:

1. Volver al commit anterior:

```bash
cd /opt/erp
git log --oneline -n 5
git checkout <COMMIT_ESTABLE>
```

2. Reconstruir y levantar:

```bash
cd /opt/erp/Back_ERP
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

3. Validar health checks.

---

## 9. Monitoreo y alertas

Ver guia:
- `docs general/GUIA_PROMETHEUS_ALERTAS_ERP.md`

Incluye ejemplos de `prometheus.yml`, reglas de alertas y checklist operativo.
