# Plan de Desarrollo - Sistema ERP/POS para PyMEs

## Arquitectura del Sistema como Modulos Integrados

Este documento describe como se relacionan los modulos del sistema, el orden
de desarrollo obligatorio y las dependencias entre ellos. Cada modulo
es una pieza de un sistema integral donde las operaciones de negocio
fluyen a traves de multiples tablas de forma atomica.

---

## Mapa de Relaciones entre Modulos

```
                    +------------------+
                    |     EMPRESA      |
                    | (tenant central) |
                    +--------+---------+
                             |
          +------------------+------------------+
          |                  |                  |
    +-----v------+    +------v-----+    +-------v------+
    |  USUARIOS  |    | ALMACENES  |    |  CATEGORIAS  |
    |  (sesiones,|    | (puntos de |    |  (arbol de   |
    |   roles,   |    |  stock)    |    |  catalogo)   |
    |   turnos)  |    +------+-----+    +-------+------+
    +-----+------+           |                  |
          |           +------v------+           |
          |           | EXISTENCIAS |<----------+
          |           | (stock x    |           |
          |           |  almacen)   |    +------v-------+
          |           +------+------+    |  PRODUCTOS   |
          |                  |           | (catalogo,   |
          |                  |           |  precios,    |
          |           +------v-------+   |  codigos)    |
          |           | MOVIMIENTOS  |   +------+-------+
          |           | INVENTARIO   |          |
          |           | (append-only)|          |
          |           +--------------+          |
          |                                     |
    +-----v------+                       +------v-------+
    | TURNOS     |                       | PROVEEDORES  |
    | CAJA       |                       +------+-------+
    +-----+------+                              |
          |                              +------v-------+
          |                              |   COMPRAS    |
          |                              | (recepcion   |
    +-----v---------------------------------+ mercancia)|
    |            ORDENES (POS)          |   +------------+
    | (transaccion atomica, nucleo del  |
    |  sistema: stock + pagos + caja)   |
    +-----+-----------------------------+
          |              |
    +-----v------+ +----v--------+
    |   PAGOS    | |  ENTREGAS   |
    | (mixtos,   | | (repartidor,|
    |  parciales)| |  domicilio) |
    +------------+ +-------------+
          |
    +-----v---------+
    |   REPORTES    |------> Solo lectura, queries analiticas
    | (dashboard    |
    |  ADMIN)       |
    +---------------+
          |
    +-----v---------+
    | AUDITORIA     |------> Append-only, registro inmutable
    | (toda accion  |
    |  critica)     |
    +---------------+
```

---

## Flujo de Datos Principal: Venta en Punto de Venta

Este es el flujo critico que atraviesa la mayor cantidad de modulos.
Toda la operacion ocurre dentro de una transaccion atomica de Prisma.

```
1. CAJERO abre turno de caja
   TurnoCaja.crear(montoApertura)
       |
2. Cliente llega al mostrador, cajero escanea productos
   Producto.buscarPorCodigoBarras(codigo)
       |
3. Se crea la orden con los items
   Orden.crear({ detalles, metodoPago, montoPagado })
       |
   Dentro de prisma.$transaction():
       |
       +---> Verificar stock disponible por producto y almacen
       +---> Crear Orden con estado PENDIENTE
       +---> Crear DetalleOrden[] con snapshot de precios
       +---> Decrementar Existencia por almacen y producto
       +---> Crear MovimientoInventario SALIDA_VENTA por cada item
       +---> Actualizar acumulados del TurnoCaja activo
       +---> Cambiar Orden.estado a COMPLETADA
       +---> Crear RegistroAuditoria
       |
4. Si es entrega a domicilio:
   Entrega.crear({ ordenId, asignadoAId, direccionEntrega })
       |
5. CAJERO cierra turno al final del dia
   TurnoCaja.cerrar({ montoCierre })
       |
6. ADMIN revisa dashboard
   Reportes.ventasDelDia(), Reportes.utilidad(), Reportes.stockBajo()
```

---

## Orden de Desarrollo por Fases

### FASE 1 -- Base (completada)

Infraestructura que todo lo demas consume. Sin esto nada funciona.

| # | Archivo | Estado |
|---|---------|--------|
| 1 | prisma/schema.prisma | Completado |
| 2 | src/config/env.ts | Completado |
| 3 | src/config/database.ts | Completado |
| 4 | src/config/cache.ts | Completado |
| 5 | src/compartido/logger.ts | Completado |
| 6 | src/compartido/respuesta.ts | Completado |
| 7 | src/compartido/errores.ts | Completado |
| 8 | src/compartido/sanitizar.ts | Completado |
| 9 | src/compartido/paginacion.ts | Completado |
| 10 | src/compartido/asyncHandler.ts | Completado |
| 11 | src/middlewares/autenticar.ts | Completado |
| 12 | src/middlewares/requerirRol.ts | Completado |
| 13 | src/middlewares/validar.ts | Completado |
| 14 | src/middlewares/limitarRates.ts | Completado |
| 15 | src/middlewares/manejarErrores.ts | Completado |
| 16 | src/tipos/express.d.ts | Completado |
| 17 | src/app.ts | Completado |
| 18 | src/server.ts | Completado |

### FASE 2 -- Autenticacion (desbloquea el acceso al sistema)

Todo el sistema depende de autenticacion. Sin login no hay acceso.

| Modulo | Archivos | Dependencias | Logica especial |
|--------|----------|-------------|-----------------|
| auth | auth.schema.ts, auth.service.ts, auth.controller.ts, auth.routes.ts | Usuario, Sesion | Login con verificacion de credenciales, estado activo, horario laboral. Logout marca sesion inactiva. /me retorna datos del usuario actual. Bloqueo tras 5 intentos fallidos. Rate limit en login. |

**Endpoints:**
- `POST /api/v1/auth/login` -- Iniciar sesion (rate limited)
- `POST /api/v1/auth/logout` -- Cerrar sesion
- `GET /api/v1/auth/me` -- Datos del usuario autenticado

### FASE 3 -- Catalogo (CRUD puro, sin transacciones complejas)

Datos maestros que las operaciones de negocio consumen.
El catalogo debe existir antes de poder vender o comprar.

| Modulo | Archivos | Dependencias | Logica especial |
|--------|----------|-------------|-----------------|
| categorias | 4 archivos estandar | Empresa | Arbol de categorias (padre/hijos). Solo ADMIN crea/edita. |
| almacenes | 4 archivos estandar | Empresa | Un almacen por defecto. Solo ADMIN crea/edita. |
| proveedores | 4 archivos estandar | Empresa | Asociacion con productos. Solo ADMIN crea/edita. |
| productos | 4 archivos estandar | Empresa, Categoria, Proveedor | GET /codigo-barras/:codigo para scanner POS. Multi-precio. Solo ADMIN crea/edita. Todos pueden consultar. |

**Relaciones clave en Fase 3:**
```
Categoria 1---N Producto
Proveedor 1---N Producto
Almacen   1---N Existencia
Producto  1---N Existencia
```

### FASE 4 -- Operaciones de Negocio (transacciones complejas)

Aqui es donde el dinero se mueve. Cada operacion toca multiples tablas
de forma atomica. Los errores aqui significan perdida de dinero o stock.

| Modulo | Archivos | Dependencias | Logica especial |
|--------|----------|-------------|-----------------|
| clientes | 4 archivos estandar | Empresa | Control de credito (limite, utilizado, dias). |
| inventario | 4 archivos estandar | Producto, Almacen, Existencia, MovimientoInventario | Ajustes manuales solo ADMIN. MovimientoInventario es append-only. Cada movimiento registra cantidadAnterior/cantidadPosterior. Transaccion atomica. |
| compras | 4 archivos estandar | Proveedor, Producto, Existencia, MovimientoInventario | Recepcion de mercancia crea MovimientoInventario ENTRADA y actualiza Existencia. Transaccion atomica. |
| turnos-caja | 4 archivos estandar | Usuario, CajaRegistradora | Abrir turno con montoApertura. Cerrar con montoCierre. Calcular diferencia. Solo ADMIN y CAJERO. |
| ordenes | 4 archivos estandar | TODAS las anteriores | MODULO MAS CRITICO. Transaccion atomica Serializable. Verifica stock, crea orden, descuenta existencias, crea movimientos, actualiza turno de caja, registra auditoria. Todo en una sola transaccion. |
| entregas | 4 archivos estandar | Orden, Cliente, Usuario (REPARTIDOR) | REPARTIDOR solo ve sus entregas. ADMIN ve todas. Estado unidireccional: ASIGNADO -> EN_RUTA -> ENTREGADO/NO_ENTREGADO. |

**Relaciones clave en Fase 4:**
```
Orden -----> DetalleOrden[] -----> Producto (snapshot de precio)
Orden -----> Pago[] (mixtos/parciales)
Orden -----> Entrega? (si es domicilio)
Orden -----> MovimientoInventario[] (SALIDA_VENTA)
Orden -----> TurnoCaja (acumulados)
Orden -----> RegistroAuditoria

Compra ----> DetalleCompra[] -----> Producto
Compra ----> MovimientoInventario[] (ENTRADA)
Compra ----> Existencia (incremento)

TurnoCaja -> Orden[] (ventas del turno)
TurnoCaja -> montoApertura / montoCierre / diferencia
```

### FASE 5 -- Analytics y Produccion

| Modulo | Archivos | Dependencias | Logica especial |
|--------|----------|-------------|-----------------|
| reportes | 4 archivos estandar | Todas las tablas (solo lectura) | Solo ADMIN. Cache con TTL 30-60s. Queries con prisma.$queryRaw (template literals). Filtros de fecha con dayjs. |

**Reportes planificados:**
- Ventas del dia/semana/mes con agrupacion
- Utilidad bruta por periodo
- Productos mas vendidos (top N)
- Stock bajo (productos bajo punto de reorden)
- Desempeno por cajero
- Movimientos de inventario por periodo
- Estado de creditos de clientes

**Entregables de produccion:**
- Swagger JSDoc en todas las rutas
- prisma/seed.ts con datos iniciales
- Tests unitarios (services de ordenes e inventario)
- Tests de integracion (flujo completo de venta)
- Dockerfile multi-stage
- docker-compose.yml + nginx.conf

---

## Dependencias entre Modulos (Grafo de Prerequisitos)

```
auth (Fase 2)
  |
  v
categorias ----+
almacenes  ----+---> productos (Fase 3)
proveedores ---+         |
                         v
clientes (Fase 4)   inventario (Fase 4)
    |                    |
    v                    v
turnos-caja -----> ordenes (Fase 4) ----> entregas (Fase 4)
                         |
                         v
                    reportes (Fase 5)
```

**Regla:** No se puede empezar un modulo si sus dependencias no estan completas.
- No hay ordenes sin productos, inventario y turnos de caja.
- No hay entregas sin ordenes.
- No hay reportes sin datos que reportar.

---

## Patron de Integracion entre Modulos

### Comunicacion interna (service a service)

Los services pueden importar otros services cuando la logica de negocio
lo requiere. Ejemplo: el service de ordenes importa el service de
inventario para verificar y decrementar stock.

```typescript
// ordenes.service.ts importa inventarioService
import { InventarioService } from '../inventario/inventario.service';

// Dentro de la transaccion de crear orden:
await InventarioService.decrementarStock(productoId, almacenId, cantidad, tx);
```

### Regla de transacciones

Cuando una operacion toca multiples tablas, el service que orquesta
la operacion recibe el cliente de transaccion (`tx`) y lo pasa a los
demas services involucrados:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Crear orden
  const orden = await tx.orden.create({ data: ... });
  // 2. Crear detalles
  await tx.detalleOrden.createMany({ data: detallesOrden });
  // 3. Decrementar stock (usa tx, no prisma global)
  await InventarioService.decrementarStock(..., tx);
  // 4. Crear movimientos de inventario
  await tx.movimientoInventario.createMany({ data: movimientos });
  // 5. Registrar auditoria
  await tx.registroAuditoria.create({ data: ... });
}, { isolationLevel: 'Serializable' });
```

### Invalidacion de cache

Cada service que muta datos invalida su cache y la de modulos dependientes:

```typescript
// Al crear/editar un producto:
invalidarCacheModulo('productos');

// Al recibir una compra (afecta stock):
invalidarCacheModulo('productos');
invalidarCacheModulo('inventario');
invalidarCacheModulo('reportes');
```

---

## Resumen de Tablas por Modulo

| Modulo | Tablas principales | Tablas auxiliares |
|--------|-------------------|-------------------|
| auth | Usuario, Sesion | -- |
| categorias | Categoria | -- |
| almacenes | Almacen | -- |
| proveedores | Proveedor | -- |
| productos | Producto | -- |
| clientes | Cliente | -- |
| inventario | Existencia, MovimientoInventario | -- |
| compras | Compra, DetalleCompra | MovimientoInventario, Existencia |
| turnos-caja | TurnoCaja, CajaRegistradora | -- |
| ordenes | Orden, DetalleOrden, Pago | Existencia, MovimientoInventario, TurnoCaja, RegistroAuditoria |
| entregas | Entrega | RegistroAuditoria |
| reportes | -- (solo lectura) | Todas las tablas |
| auditoria | RegistroAuditoria | -- (transversal, todos los modulos escriben aqui) |
| notificaciones | Notificacion | -- (transversal) |

---

## Siguiente paso: Fase 2 (auth)

Con la base completa y el schema en espanol, el proximo modulo a desarrollar
es autenticacion. Una vez que auth funcione, el resto de modulos pueden
protegerse con los middlewares de autenticar y requerirRol.
