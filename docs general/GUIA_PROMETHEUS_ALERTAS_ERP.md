# Guia Prometheus y Alertas (ERP VPS)

Fecha: 2026-03-16
Objetivo: activar monitoreo basico en VPS Ubuntu para API ERP.

---

## 1. Requisitos previos

- Backend desplegado con `METRICS_ENABLED=true`.
- `METRICS_TOKEN` configurado.
- HTTPS activo en Nginx de produccion.

---

## 2. Archivos base incluidos

- `Back_ERP/ops/prometheus/prometheus.yml`
- `Back_ERP/ops/prometheus/alerts.yml`

Ajustar en `prometheus.yml`:
- `tu-dominio.com`
- `CAMBIAR_POR_METRICS_TOKEN`

---

## 3. Levantar Prometheus en el VPS (docker)

Ejemplo rapido:

```bash
docker run -d --name prometheus \
  -p 9090:9090 \
  -v /opt/erp/Back_ERP/ops/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro \
  -v /opt/erp/Back_ERP/ops/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro \
  prom/prometheus:latest
```

Verificar:
- `http://<IP_VPS>:9090/targets`
- `http://<IP_VPS>:9090/alerts`

---

## 4. Alertas minimas recomendadas

- `ERPApiDown`: backend no scrapeable por 1 minuto.
- `ERPHigh5xxRate`: errores 5xx > 1% por 5 minutos.
- `ERPHighLatencyP95`: p95 > 1.5s por 5 minutos.

---

## 5. Operacion

Checklist semanal:
- Confirmar target en estado `UP`.
- Revisar alertas disparadas y causa raiz.
- Revisar tendencia de latencia p95 y errores 5xx.

Checklist pre-release:
- Confirmar metricas publicandose tras deploy.
- Confirmar que `METRICS_TOKEN` no se expone en repositorio.
