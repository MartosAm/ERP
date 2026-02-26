# Documentacion Tecnica -- ERP/POS Backend

## Sobre esta documentacion

Esta carpeta contiene la documentacion tecnica del backend del sistema ERP/POS.
Cada archivo cubre un aspecto especifico del proyecto y puede leerse de forma
independiente, aunque siguen un orden logico de lo general a lo particular.

## Indice de documentos

| # | Documento | Contenido |
|---|---|---|
| 01 | [Pruebas y Testing](01_PRUEBAS_Y_TESTING.md) | Estrategia de pruebas, librerias utilizadas, como ejecutar los 87 tests E2E, estructura del script de validacion, tests manuales con REST Client |
| 02 | [Arquitectura](02_ARQUITECTURA.md) | Stack tecnologico, estructura de carpetas, patron modular (service-controller-routes-schema), pipeline de middlewares, sistema de autenticacion y autorizacion, modelo de datos |
| 03 | [Calidad de Codigo y SOLID](03_CALIDAD_CODIGO_Y_SOLID.md) | Los 5 principios SOLID aplicados con ejemplos reales del proyecto, patrones de diseno utilizados, reglas del proyecto, estrategia de validacion, convencion de nombres, anti-patrones evitados |
| 04 | [Archivos Compartidos y Reutilizacion](04_ARCHIVOS_COMPARTIDOS_Y_REUTILIZACION.md) | Detalle de cada archivo en compartido/, config/, middlewares/ y tipos/; grafo de dependencias entre archivos; metricas de reutilizacion; principios de extraccion |
| 05 | [Produccion e Infraestructura](05_PRODUCCION_E_INFRAESTRUCTURA.md) | Dockerfile multi-stage, docker-compose de produccion, Nginx reverse proxy, variables de entorno, health checks, seguridad HTTP, scripts de despliegue, checklist pre-produccion |

## Documentos preexistentes

| Documento | Contenido |
|---|---|
| [Flujo de Desarrollo API](FLUJO_DESARROLLO_API.md) | Guia paso a paso para crear un nuevo modulo de la API |
| [Plan de Desarrollo](PLAN_DESARROLLO.md) | Roadmap original del proyecto |

## Convenciones

- Sin emojis en la documentacion tecnica
- Todos los ejemplos de codigo provienen del proyecto real (no son inventados)
- Cada documento incluye un indice al inicio para navegacion rapida
- Los comandos de terminal se muestran en bloques de codigo con indicacion del shell
