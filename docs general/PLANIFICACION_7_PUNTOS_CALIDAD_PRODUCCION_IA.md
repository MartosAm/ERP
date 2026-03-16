# Planificacion Robusta y Calidad de Codigo (7 Puntos)

Proyecto: ERP Full Stack (Back_ERP + Front_ERP-1)
Objetivo: Entregar software de calidad, mantenible, seguro y usable en produccion.
Publico: Equipo tecnico y agentes de IA que ejecutan tareas de desarrollo, revision y hardening.

---

## Como usar este documento

- Cada punto define objetivo, practicas minimas, entregables y criterio de aceptacion.
- Si un agente de IA toma una tarea, debe reportar avances contra estos 7 puntos.
- Ningun cambio se considera "terminado" si no cumple el checklist del punto correspondiente.

---

## 1. Arquitectura y Limites Claros

### Objetivo
Mantener una arquitectura estable, extensible y facil de entender.

### Practicas obligatorias
- Mantener separacion por capas en backend: `routes -> controller -> service -> prisma`.
- Evitar logica de negocio en controllers y componentes visuales.
- Mantener contratos de API estables (`ApiResponse.ok/fail`) para evitar drift Front/Back.
- Documentar decisiones importantes en archivos `docs/`.

### Entregables
- Rutas y casos de uso nuevos con estructura existente.
- Cambios de contrato API documentados.
- Impacto en modulos dependientes identificado.

### Criterio de aceptacion
- Sin acoplamiento circular.
- Sin codigo duplicado entre modulos.
- Flujo funcional trazable de endpoint/feature de inicio a fin.

---

## 2. Calidad de Codigo y SOLID

### Objetivo
Reducir deuda tecnica y facilitar evolucion segura del sistema.

### Practicas obligatorias
- Aplicar SOLID en cambios nuevos y refactors.
- Mantener funciones pequenas y con una responsabilidad principal.
- Usar tipos fuertes en TypeScript, sin `any` salvo excepcion justificada.
- Centralizar errores operacionales en jerarquia `AppError`.

### Guia SOLID rapida
- S (Single Responsibility): un archivo/funcion, una razon de cambio.
- O (Open/Closed): extender por composicion, no romper implementaciones existentes.
- L (Liskov): subtipos sin sorpresas en comportamiento esperado.
- I (Interface Segregation): interfaces pequenas y orientadas a uso real.
- D (Dependency Inversion): depender de abstracciones, no de detalles de infraestructura.

### Entregables
- Codigo con nombres claros y convenciones consistentes.
- Comentarios solo en logica no obvia.
- Refactor minimo cuando se detecte redundancia evidente.

### Criterio de aceptacion
- `npm run typecheck` sin errores.
- Cambios legibles sin explicar "magia" fuera del codigo.

---

## 3. Pruebas, Validacion y Confiabilidad

### Objetivo
Detectar fallos antes de produccion y prevenir regresiones.

### Practicas obligatorias
- Mantener y ampliar pruebas unitarias/integracion al tocar reglas de negocio.
- Validar entradas con Zod en endpoints.
- Probar rutas criticas de negocio: auth, ordenes, inventario, pagos, turnos.
- Incluir casos limite: errores de validacion, conflictos, estados no permitidos.

### Entregables
- Pruebas nuevas para escenarios nuevos.
- Ajustes de tests existentes cuando cambia comportamiento esperado.

### Criterio de aceptacion
- `npm test` backend en verde.
- Sin gaps en escenarios criticos de negocio tocados por el cambio.

---

## 4. Robustez Operacional (No Duplicados, No Reprocesos)

### Objetivo
Evitar peticiones dobles, inconsistencias por concurrencia y errores intermitentes.

### Practicas obligatorias
- Implementar idempotencia en operaciones criticas (ej: crear orden, confirmar cobro).
- Bloquear doble submit en frontend (`estado procesando`, botones deshabilitados, guardas de teclado).
- Mantener transacciones atomicas en operaciones de inventario/pago.
- Definir manejo de reintentos solo en metodos idempotentes.
- Agregar reglas para deduplicacion por ventana temporal en endpoints sensibles.

### Entregables
- Middleware o estrategia de idempotencia documentada.
- Evidencia de que el flujo no duplica ordenes por doble click/retry.

### Criterio de aceptacion
- Mismo request repetido no genera doble efecto en operaciones criticas.
- Pruebas de concurrencia/reintento cubiertas en modulos de alto riesgo.

---

## 5. Seguridad por Diseno

### Objetivo
Reducir superficie de ataque y proteger datos/operacion del negocio.

### Practicas obligatorias
- Mantener JWT seguro (algoritmo explicito, expiracion, validacion de sesion).
- Mantener middlewares de seguridad activos: helmet, sanitizacion, validacion content-type, rate limit.
- No exponer secretos en repositorio ni defaults inseguros en produccion.
- Restringir CORS y revisar cabeceras bajo proxy real.
- Evitar filtrar detalles internos en errores de produccion.

### Entregables
- Checklist de seguridad aplicado antes de release.
- Configuracion de entorno validada (`.env`, `docker-compose.prod.yml`, `nginx`).

### Criterio de aceptacion
- Sin secretos hardcodeados.
- Endpoints criticos protegidos por auth + autorizacion + rate limit.

---

## 6. Observabilidad, Monitoreo y Soporte

### Objetivo
Poder detectar, diagnosticar y resolver incidentes rapido.

### Practicas obligatorias
- Logging estructurado con `requestId` en rutas criticas.
- Health checks funcionales (`/api/health`, `/api/health/ready`).
- Definir metricas minimas: latencia, 5xx, throughput, uso de pool DB.
- Mantener convencion de errores para rastrear causa raiz.

### Entregables
- Logs utiles para auditoria tecnica y soporte.
- Dashboard o plan de metricas/alertas minimas para produccion.

### Criterio de aceptacion
- Incidente reproducible con evidencia de logs y pasos claros.
- Tiempo de diagnostico reducido por trazabilidad consistente.

---

## 7. Entrega Continua y Gobierno de Cambios

### Objetivo
Publicar cambios con seguridad, sin romper operacion en caja/ventas.

### Practicas obligatorias
- Pipeline minimo: typecheck -> tests -> build -> deploy.
- Migraciones de BD controladas (`db:migrate:deploy` en prod).
- Estrategia de rollback definida antes de desplegar.
- Versionado de cambios y notas de release por modulo impactado.
- Mantener README y docs alineados con estado real del sistema.

### Entregables
- Checklist pre-release aprobado.
- Evidencia de build frontend/backend exitosos.
- Plan de rollback y validacion post-deploy.

### Criterio de aceptacion
- Deploy sin downtime no planificado.
- Fallo recuperable con rollback documentado y probado.

---

## Plantilla Operativa para Agente de IA

Usar esta estructura al ejecutar una tarea:

```md
## Objetivo del cambio
- Que problema de negocio se resuelve.

## Punto(s) del plan afectados
- [ ] 1 Arquitectura
- [ ] 2 Calidad/SOLID
- [ ] 3 Pruebas
- [ ] 4 Robustez (duplicados/concurrencia)
- [ ] 5 Seguridad
- [ ] 6 Observabilidad
- [ ] 7 Entrega

## Alcance tecnico
- Archivos a tocar
- Riesgos
- Supuestos

## Implementacion
- Cambios realizados
- Motivo de cada cambio

## Validacion ejecutada
- Comandos corridos
- Resultado

## Resultado final
- Estado: completo / parcial
- Pendientes para cerrar produccion
```

---

## Definition of Done Global (Produccion)

Un cambio se considera listo para produccion solo si:

- Cumple al menos 1 punto del plan sin degradar los demas.
- No introduce duplicados funcionales ni deuda tecnica innecesaria.
- Tiene validacion tecnica ejecutada (typecheck/tests/build segun aplique).
- Mantiene seguridad y trazabilidad operativa.
- Deja documentacion minima para que otro desarrollador o agente IA continue sin friccion.

---

## Prioridad recomendada para este ERP (estado actual)

1. Idempotencia y bloqueo de doble submit en flujos de venta/cobro.
2. Endurecer despliegue productivo (TLS, rate limit distribuido, secretos).
3. Monitoreo operativo minimo (errores, latencia, salud de BD).
4. Alineacion continua de docs con implementacion real.

Con esta secuencia se reduce riesgo operativo primero y se consolida calidad sostenible despues.
