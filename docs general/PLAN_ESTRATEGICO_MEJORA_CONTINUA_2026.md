# Plan Estrategico de Mejora Continua 2026 - ERP

Este documento define la ruta de accion para mejorar el sistema sin romper la operacion actual.

Contexto actual:
- Las APIs estan funcionando correctamente.
- El sistema ya tiene base solida en backend, seguridad y frontend.
- Se prioriza mejorar calidad, experiencia de usuario, hardening y despliegue.

## 1. Objetivo General

Consolidar el ERP como una plataforma operable, segura y mantenible, alineada con practicas reconocidas de ingenieria de software y arquitectura de sistemas:
- ISO/IEC 25010 (calidad de producto: fiabilidad, mantenibilidad, seguridad, usabilidad),
- OWASP ASVS y OWASP Top 10 (controles de seguridad aplicativa),
- NIST SSDF (desarrollo seguro en ciclo de vida),
- principios SRE para operacion (observabilidad, resiliencia, recuperacion).

Este objetivo se considera cumplido cuando el sistema demuestra, con evidencia verificable, los siguientes resultados:
- continuidad operativa sin regresiones criticas en modulos core (auth, ordenes, inventario, compras, entregas),
- postura de seguridad validada en escenarios de autenticacion, autorizacion, rate limiting, idempotencia y proteccion de transporte,
- experiencia de usuario consistente y accesible en flujos principales (desktop y mobile),
- despliegue repetible en VPS Ubuntu 24.04 con rollback probado y recuperacion documentada.

Metricas objetivo iniciales:
- builds y pruebas criticas en verde en cada release candidata,
- disponibilidad operacional >= 99.5%,
- tiempo objetivo de recuperacion (rollback tecnico) <= 15 minutos,
- cero hallazgos criticos abiertos en checklist de seguridad previo a produccion.

## 2. Principios de Ejecucion

1. Estabilidad primero (change safety)
- Ningun cambio pasa a la siguiente fase si degrada funciones en modulos core.
- Todo ajuste debe incluir plan de verificacion y criterio de rollback.

2. Entregas pequenas y trazables
- Cambios en lotes cortos por seccion o tema (documentacion, seguridad, API, UX, despliegue).
- Cada lote debe tener alcance definido, evidencia y commit tematico.

3. Calidad basada en evidencia
- Cada decision debe sustentarse con resultados verificables: tests, logs, reportes de build, checks de seguridad.
- Si no hay evidencia, el cambio se considera incompleto.

4. Seguridad por defecto (secure by default)
- Toda funcionalidad nueva o modificada debe mantener controles de autenticacion, autorizacion, validacion e idempotencia cuando aplique.
- Se prohibe relajar controles de seguridad para acelerar entregas.

5. Observabilidad y operabilidad desde el diseno
- Cada mejora debe preservar o mejorar trazabilidad operacional: health/readiness, logs con correlacion, metricas utiles.
- Todo cambio operativo debe incluir procedimiento de recuperacion.

6. Gobernanza tecnica y control de riesgo
- Definir "Definition of Done" por seccion: alcance cumplido, evidencia adjunta y validacion de no regresion.
- Aplicar criterio Go/No-Go antes de fusionar fases mayores.

7. Documentacion viva
- Toda decision estructural, cambio de arquitectura o ajuste de proceso debe actualizar la documentacion correspondiente en la misma iteracion.
- Evitar brecha entre sistema real y documentacion oficial.

## 3. Prioridades por Frentes

### A. Seguridad y Cumplimiento
Prioridad: Alta

Acciones:
- Revisar endurecimiento de secrets en produccion (.env solo en VPS).
- Confirmar TLS completo y renovacion automatizada de certificados.
- Validar escenarios criticos: 401, 403, 415, 429, idempotencia 409.
- Revisar periodicidad de rotacion de JWT_SECRET y tokens internos de metricas.

Entregables:
- Checklist de hardening firmado.
- Evidencia de pruebas de seguridad por endpoint critico.

### B. APIs y Reglas de Negocio
Prioridad: Alta

Acciones:
- Consolidar contratos API por modulo (request/response estandar).
- Mantener bateria de tests de modulos core: auth, ordenes, inventario, compras, entregas.
- Ejecutar flujo E2E completo en cada release candidata.
- Definir matriz de compatibilidad para cambios de esquema/migraciones.

Entregables:
- Matriz de contratos API por modulo.
- Reporte de regresion por release.

### C. Diseño, UX y Frontend
Prioridad: Media-Alta

Acciones:
- Completar homogeneidad visual de todas las pantallas CRUD restantes.
- Estandarizar estados UX: loading, empty, error, success.
- Ajustar accesibilidad (contraste, foco teclado, labels ARIA en componentes criticos).
- Revisar consistencia responsive (desktop/tablet/mobile).

Entregables:
- Checklist UX por modulo.
- Validacion visual final por rutas clave.

### D. Despliegue y Operacion VPS
Prioridad: Alta

Acciones:
- Unificar estrategia de proxy Front + Back bajo mismo dominio.
- Verificar health/readiness y alertas de caida.
- Probar rollback real por commit estable.
- Programar backup y prueba de restore de BD.

Entregables:
- Runbook operativo de incidentes.
- Prueba documentada de rollback y restore.

### E. Mantenibilidad y Documentacion
Prioridad: Media

Acciones:
- Actualizar README internos desalineados con arquitectura actual.
- Unificar versiones de Node entre CI y Docker (evitar drift de entorno).
- Mantener una bitacora de cambios de arquitectura y decisiones tecnicas.

Entregables:
- README actualizados.
- ADRs o registro de decisiones tecnicas.

## 4. Roadmap por Fases (8 semanas sugeridas)

## Fase 1 (Semana 1-2): Aseguramiento Base
- Hardening de seguridad en prod.
- Verificacion CI/CD y quality gate.
- Evidencia de pruebas API core.

## Fase 2 (Semana 3-4): UX y Estabilidad Front
- Cerrar pendientes de diseno visual y componentes.
- Validacion responsive y accesibilidad.
- Correcciones de deuda tecnica de UI.

## Fase 3 (Semana 5-6): Operacion VPS
- Deploy controlado en VPS.
- Monitoreo, alertas y tableros basicos.
- Prueba de rollback + restore.

## Fase 4 (Semana 7-8): Consolidacion
- Documentacion final operativa.
- Cierre de gaps de seguridad/documentacion.
- Go-live checklist final.

## 5. Indicadores de Exito (KPIs)

- Build y tests en verde en cada release candidata.
- 0 incidentes criticos por regresion en modulos core.
- Disponibilidad de servicios superior a 99.5% en entorno productivo.
- Tiempo de recuperacion (rollback) menor a 15 minutos.
- Cobertura de checklist de seguridad y despliegue al 100%.

## 6. Criterio de Go/No-Go

Go:
- Seguridad validada + TLS activo.
- APIs core estables sin regresion.
- Front validado visual y funcionalmente.
- Rollback probado y backups verificados.

No-Go:
- Fallos en tests criticos de negocio.
- Brechas de seguridad sin mitigacion.
- Sin evidencia de restore/rollback.

## 7. Siguiente Paso Inmediato

Ejecutar un Sprint de Cierre Tecnico con esta secuencia:
1. Seguridad prod + CI consistente.
2. Cierre UX y secciones pendientes.
3. Validacion E2E y hardening final en VPS.

---
Documento vivo: actualizar al cierre de cada semana con avances, bloqueos y decisiones.
