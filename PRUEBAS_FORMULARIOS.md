# Guía de Pruebas de Formularios — ERP POS

> **Fecha de pruebas:** 07/03/2026  
> **Entorno:** Angular 17.3 + Express + Prisma + PostgreSQL  
> **URL Frontend:** `http://localhost:4200` | **API:** `http://localhost:3001/api/v1`

---

## Índice

1. [Resumen de Pruebas](#resumen-de-pruebas)
2. [Bugs Encontrados y Corregidos](#bugs-encontrados-y-corregidos)
3. [Módulo: Proveedores](#módulo-proveedores)
4. [Módulo: Categorías](#módulo-categorías)
5. [Módulo: Almacenes](#módulo-almacenes)
6. [Módulo: Productos](#módulo-productos)
7. [Módulo: Compras](#módulo-compras)
8. [Módulo: Turnos de Caja](#módulo-turnos-de-caja)
9. [Módulo: Punto de Venta (POS) / Órdenes](#módulo-punto-de-venta-pos--órdenes)
10. [Módulo: Entregas](#módulo-entregas)
11. [Módulo: Usuarios](#módulo-usuarios)
12. [Módulo: Clientes](#módulo-clientes)
13. [Módulo: Autenticación](#módulo-autenticación)
14. [Módulo: Inventario](#módulo-inventario)
15. [Módulo: Reportes](#módulo-reportes)
16. [Módulo: Configuración](#módulo-configuración)
17. [Módulo: Dashboard](#módulo-dashboard)
18. [Errores Comunes del Usuario](#errores-comunes-del-usuario)
19. [Flujo Completo de Prueba (Paso a Paso)](#flujo-completo-de-prueba-paso-a-paso)

---

## Resumen de Pruebas

| Módulo | Estado | Resultado |
|--------|--------|-----------|
| Proveedores | ✅ CRUD completo | Creado: "Distribuidora Nacional S.A. de C.V." |
| Categorías | ✅ CRUD completo | Creada: "Abarrotes" con color e ícono |
| Almacenes | ✅ CRUD completo | Creado: "Bodega Norte CDMX" |
| Productos | ✅ CRUD completo | Creado: "Coca-Cola 600ml" (SKU: BEB-CC-600) |
| Compras | ✅ Crear + Recibir | Compra COMP-2026-00001 ($696.00), recibida |
| Turnos de Caja | ✅ Abrir + Cerrar | Turno abierto/cerrado desde UI (dropdown cajas) |
| POS / Órdenes | ✅ Venta completa | VTA-2026-00001, 00002, 00003 |
| Devoluciones | ✅ Parcial + Total | Devolución parcial (2 de 3 unidades) funcional |
| Entregas | ✅ Crear + Visualizar | Entrega creada desde orden VTA-2026-00002 |
| Usuarios | ✅ Crear usuario | Repartidor: miguel.hernandez@minegocio.com |
| Clientes | ✅ CRUD completo | Creada: "María García Rodríguez" con crédito $5,000 |
| Autenticación | ✅ Login + Registro | Login admin, registro empresa nueva |
| Inventario | ✅ Ajuste + Traslado | Ajuste manual (50 pza) y traslado (10 a Bodega Norte) |
| Reportes | ✅ 6 tabs probadas | Ventas, Top productos, Métodos pago, Inventario, Cajeros, Entregas |
| Configuración | ✅ Perfil + Seguridad | PIN de cajero cambiado exitosamente |
| Dashboard | ✅ KPIs correctos | Ventas, utilidad, stock bajo, devoluciones, compras, entregas |

---

## Bugs Encontrados y Corregidos

### Bug 1: Límite de productos en dropdowns (400 Bad Request)

- **Archivo:** `compra-form-dialog.component.ts`, `ajuste-dialog.component.ts`, `traslado-dialog.component.ts`
- **Problema:** El frontend enviaba `limite=200` pero el backend solo permite `max(100)` en `FiltroProductosSchema`
- **Efecto:** Al abrir "Nueva compra", el dropdown de productos aparecía vacío
- **Fix:** Cambiar `limite: 200` → `limite: 100` en los 3 componentes
- **Impacto:** ⚠️ Si el negocio tiene >100 productos, el dropdown los truncará

### Bug 2: Precios Prisma Decimal como strings (400 → 422 en POS)

- **Archivos:** `ordenes.schema.ts` (backend), `pos.component.ts` (frontend)
- **Problema:** Prisma `Decimal` se serializa como string (`"18.00"` en vez de `18.00`). Zod `z.number()` rechaza strings.
- **Efecto:** Al confirmar una venta en POS: "Error al procesar la venta"
- **Fix Backend:** Cambiar `z.number()` → `z.coerce.number()` en `DetalleOrdenSchema` y `PagoSchema`
- **Fix Frontend:** Envolver precios con `Number()` en `getPrecio()` y `getPrecioPOS()`

### Bug 3: Prisma select + include simultáneo en cierre de turno

- **Archivo:** `turnos-caja.service.ts`
- **Problema:** Query usa `select` e `include` juntos en la relación `ordenes`
- **Efecto:** "Error al cerrar el turno" (Prisma validation error)
- **Fix:** Reestructurar query para usar solo `select` con `pagos` anidado
- **Estado:** ✅ Confirmado funcionando desde UI (abrir + cerrar turno completo)

### Bug 4 (UX): Campo de caja registradora en Turnos de Caja

- **Problema:** El formulario pide "ID de caja registradora" como texto libre, pero espera un CUID interno de la BD
- **Efecto:** Usuario escribe "CAJA-01" pero necesita ingresar `cmmfp9ar10008nxoq5lyt5mlm`
- **Estado:** ✅ Corregido — ahora es un dropdown que lista las cajas registradoras disponibles

### Bug 5: Devolución `cantidad` como string (400 Bad Request)

- **Archivo:** `ordenes.schema.ts` (backend) — `ItemDevolucionSchema`
- **Problema:** `cantidad` usaba `z.number()` pero Prisma Decimal serializa como string, y el frontend también lo envía como string
- **Efecto:** Al hacer clic en "Devolver" en una orden: "Error al procesar la devolución" (HTTP 400)
- **Fix:** Cambiar `z.number()` → `z.coerce.number()` en `ItemDevolucionSchema.cantidad`
- **Patrón:** Mismo patrón que Bug 2 — todos los campos Decimal de Prisma necesitan `z.coerce.number()`

---

## Módulo: Proveedores

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Nombre** | ✅ Sí | Texto | 2–150 chars | `Distribuidora Nacional S.A. de C.V.` |
| Nombre contacto | ❌ | Texto | máx. 150 chars | `Roberto García Hernández` |
| Teléfono | ❌ | Texto | máx. 20 chars | `5551234567` |
| Correo | ❌ | Email válido | — | `ventas@distribuidora-nacional.com.mx` |
| Dirección | ❌ | Texto | máx. 300 chars | `Av. Insurgentes Sur 1234, Col. Del Valle` |
| RFC | ❌ | Texto | máx. 13 chars | `DNA090101AB3` |
| Notas | ❌ | Textarea | máx. 1,000 chars | `Entrega los lunes y jueves` |

### ⚠️ Errores Comunes a Evitar

- **Nombre muy corto:** Mínimo 2 caracteres. No ingresar solo una letra.
- **Correo inválido:** Debe tener formato `usuario@dominio.com`. Sin espacios.
- **RFC:** Exactamente 12 (persona moral) o 13 (persona física) caracteres alfanuméricos.
  - Formato persona moral: `AAA######XX` (3 letras + 6 dígitos + 2 alfanuméricos)
  - Formato persona física: `AAAA######XXX` (4 letras + 6 dígitos + 3 alfanuméricos)
- **Teléfono:** Solo números, sin guiones ni paréntesis. Máximo 20 dígitos.

### Datos de Prueba Usados

```
Nombre:          Distribuidora Nacional S.A. de C.V.
Nombre contacto: Roberto García Hernández
Teléfono:        5551234567
Correo:          ventas@distribuidora-nacional.com.mx
Dirección:       Av. Insurgentes Sur 1234, Col. Del Valle, CDMX
RFC:             DNA090101AB3
Notas:           Entrega los lunes y jueves, pedido mínimo $500
```

---

## Módulo: Categorías

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Nombre** | ✅ Sí | Texto | 2–100 chars | `Abarrotes` |
| Descripción | ❌ | Textarea | máx. 500 chars | `Productos de consumo básico` |
| Categoría padre | ❌ | Select (CUID) | — | Seleccionar de la lista |
| Color hex | ❌ | Color picker | Regex `#hex` | `#FF5733` |
| Ícono | ❌ | Texto | máx. 50 chars | `local_grocery_store` |
| Orden | ❌ | Entero | mín. 0 | `1` |

### ⚠️ Errores Comunes a Evitar

- **Color hex:** Debe incluir el `#` al inicio. Formato: `#RRGGBB` (6 dígitos hexadecimales).
  - ✅ Correcto: `#FF5733`, `#000000`, `#FFFFFF`
  - ❌ Incorrecto: `FF5733`, `rojo`, `#GGG`
- **Ícono:** Usar nombres de [Material Symbols](https://fonts.google.com/icons). Ejemplos:
  - `local_grocery_store`, `restaurant`, `liquor`, `medication`, `cleaning_services`
- **Orden:** Solo números enteros positivos (0, 1, 2...). No decimales.

### Datos de Prueba Usados

```
Nombre:      Abarrotes
Descripción: Productos de consumo básico y despensa
Color:       #FF5733
Ícono:       local_grocery_store
```

---

## Módulo: Almacenes

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Nombre** | ✅ Sí | Texto | 2–100 chars | `Bodega Norte CDMX` |
| Dirección | ❌ | Texto | máx. 300 chars | `Blvd. Manuel Ávila Camacho 456` |
| Es principal | ❌ | Toggle | booleano | `false` |

### ⚠️ Errores Comunes a Evitar

- **Nombre muy corto:** Mínimo 2 caracteres.
- **Es principal:** Solo puede haber UN almacén principal. Si ya existe uno, desactivarlo primero.
- **Dirección:** Incluir calle, número, colonia y CP para facilitar logística.

### Datos de Prueba Usados

```
Nombre:    Bodega Norte CDMX
Dirección: Blvd. Manuel Ávila Camacho 456, Naucalpan, Edo. Mex.
Principal: No
```

---

## Módulo: Productos

### Campos del Formulario (3 pestañas)

#### Pestaña 1: General

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **SKU** | ✅ Sí | Texto | 1–50 chars | `BEB-CC-600` |
| **Nombre** | ✅ Sí | Texto | 2–200 chars | `Coca-Cola 600ml` |
| Código de barras | ❌ | Texto | máx. 50 chars | `7501055300120` |
| Categoría | ❌ | Select | — | `Abarrotes` |
| Proveedor | ❌ | Select | — | `Distribuidora Nacional` |
| Marca | ❌ | Texto | máx. 100 chars | `Coca-Cola` |
| Modelo | ❌ | Texto | máx. 100 chars | `600ml PET` |
| Tipo unidad | ❌ | Enum | — | `PIEZA` (default) |

#### Pestaña 2: Precios

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| Precio costo | ❌ | Decimal | mín. 0 | `12.50` |
| **Precio venta 1** | ✅ Sí | Decimal | mín. 0 | `18.00` |
| Precio venta 2 | ❌ | Decimal | mín. 0 | `16.50` |
| Precio venta 3 | ❌ | Decimal | mín. 0 | — |
| Tasa impuesto | ❌ | Decimal | 0–1 | `0.16` (=16% IVA) |
| Impuesto incluido | ❌ | Toggle | — | `true` |

#### Pestaña 3: Inventario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| Stock mínimo | ❌ | Entero | mín. 0 | `10` |
| Stock máximo | ❌ | Entero | — | `200` |
| Rastrear inventario | ❌ | Toggle | — | `true` |

### ⚠️ Errores Comunes a Evitar

- **SKU duplicado:** El SKU debe ser único por empresa. Si ya existe, el sistema rechazará la creación.
  - Convención sugerida: `[CATEGORÍA]-[MARCA]-[PRESENTACIÓN]` → `BEB-CC-600`
- **Código de barras:** Ingresar el código EAN-13 del producto (13 dígitos numéricos). Es el que aparece en la etiqueta.
  - ✅ `7501055300120`
  - ❌ `750-1055-300120` (sin guiones)
- **Tasa impuesto:** Es un valor decimal entre 0 y 1, NO un porcentaje.
  - ✅ `0.16` (para 16% IVA)
  - ❌ `16` (esto sería 1600% de impuesto!)
- **Precios:** No ingresar símbolos de moneda (`$`). Solo números.
  - ✅ `18.00`
  - ❌ `$18.00`
- **Stock mínimo > máximo:** Asegurarse que el stock mínimo sea menor al máximo.
- **Precio venta < costo:** ⚠️ Se permite, pero generará pérdida. Revisar antes de guardar.

### Datos de Prueba Usados

```
SKU:              BEB-CC-600
Nombre:           Coca-Cola 600ml
Código de barras: 7501055300120
Categoría:        Abarrotes
Proveedor:        Distribuidora Nacional S.A. de C.V.
Marca:            Coca-Cola
Precio costo:     12.50
Precio venta 1:   18.00
Precio venta 2:   16.50
Tasa impuesto:    0.16 (incluido en precio)
Stock mínimo:     10
Stock máximo:     200
Rastrear inv.:    Sí
```

---

## Módulo: Compras

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Proveedor** | ✅ Sí | Select | — | `Distribuidora Nacional S.A. de C.V.` |
| Número factura | ❌ | Texto | máx. 100 chars | `FAC-2026-0001` |
| Notas | ❌ | Textarea | máx. 500 chars | `Pedido urgente` |
| **Productos** | ✅ Mín. 1 | Lista | — | Ver abajo |

#### Detalle de Producto en Compra

| Campo | Obligatorio | Tipo | Límite |
|-------|:-----------:|------|--------|
| **Producto** | ✅ Sí | Select | — |
| **Cantidad** | ✅ Sí | Número | > 0 |
| **Costo unitario** | ✅ Sí | Decimal | ≥ 0 |

### Flujo de Compra

1. **Crear compra** → Estado: "Pendiente"
2. **Recibir mercancía** → Se selecciona almacén destino → Estado: "Recibida"
3. Al recibir, el inventario se actualiza automáticamente (movimiento tipo ENTRADA)

### ⚠️ Errores Comunes a Evitar

- **Sin productos:** La compra debe tener al menos 1 producto. No se puede crear vacía.
- **Cantidad 0 o negativa:** La cantidad debe ser mayor a 0.
- **Dropdown vacío de productos:** Si no aparecen productos en el dropdown, verificar que existan productos activos creados. *(Bug anterior: se corrigió el límite de 200→100)*
- **Número de factura:** Es libre, pero se recomienda un formato consistente: `FAC-YYYY-NNNN`
- **No olvidar "Recibir":** Crear la compra NO agrega stock. Se debe dar clic en "Recibir" y seleccionar almacén.

### Datos de Prueba Usados

```
Proveedor:     Distribuidora Nacional S.A. de C.V.
Factura:       FAC-2026-0001
Producto:      Coca-Cola 600ml (BEB-CC-600)
Cantidad:      48
Costo unitario: 12.50
Total:         $696.00 (sub: $600 + IVA: $96)
Estado:        Recibida en "Almacen Principal"
```

---

## Módulo: Turnos de Caja

### Abrir Turno

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **ID caja registradora** | ✅ Sí | Texto (CUID) | mín. 1 char | `cmmfp9ar10008nxoq5lyt5mlm` |
| **Monto apertura** | ✅ Sí | Decimal | ≥ 0 | `1500.00` |
| Notas | ❌ | Textarea | máx. 500 chars | `Turno matutino` |

### Cerrar Turno

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Monto de cierre** | ✅ Sí | Decimal | ≥ 0 | `1572.00` |
| Notas | ❌ | Textarea | máx. 500 chars | `Sin novedades` |

### ⚠️ Errores Comunes a Evitar

- **ID de caja registradora:** ⚠️ **PROBLEMA DE UX** — El campo actual pide un ID interno (CUID) de la base de datos, no un nombre amigable como "CAJA-01". El usuario debe consultar la BD o usar el ID exacto de la caja.
  - 🔧 **Recomendación:** Este campo debería ser un dropdown con las cajas disponibles.
  - IDs de ejemplo del seed: `cmmfp9ar10008nxoq5lyt5mlm` ("Caja 1")
- **Monto apertura en 0:** Se permite, pero normalmente se inicia con un fondo de caja ($500-$2,000).
- **Solo 1 turno abierto:** No se puede abrir un turno si ya hay uno abierto por el mismo usuario.
- **Cerrar turno de otro usuario:** Solo ADMIN puede cerrar turnos de otros usuarios.
- **Monto de cierre:** Contar TODO el efectivo en la caja (apertura + ventas efectivo - cambio dado).

### Datos de Prueba Usados

```
Apertura:
  Caja ID:       cmmfp9ar10008nxoq5lyt5mlm
  Monto apertura: 1500.00
  Notas:         Turno matutino, fondo de caja estándar

Cierre:
  Monto cierre:  1572.00
  Notas:         Cierre turno matutino. 2 ventas POS realizadas.
  Diferencia:    $14.00 (sobrante)
```

---

## Módulo: Punto de Venta (POS) / Órdenes

### Requisitos Previos

- ⚠️ **Turno de caja abierto** — Sin turno activo, el POS muestra "No hay turno de caja abierto"
- ⚠️ **Productos con stock** — Los productos deben tener existencias (recibir compras primero)

### Crear Venta (Orden)

| Campo | Obligatorio | Tipo | Ejemplo |
|-------|:-----------:|------|---------|
| **Productos** | ✅ Mín. 1 | Click en catálogo | Coca-Cola 600ml |
| Cantidad | Auto (1) | + / − botones | 2 |
| Cliente | ❌ | Botón persona+ | Seleccionar de lista |
| **Método de pago** | ✅ | Botones | `EFECTIVO` |
| **Monto recibido** | ✅ | Número | `50.00` |

### Métodos de Pago

| Método | Código Backend | Descripción |
|--------|---------------|-------------|
| Efectivo | `EFECTIVO` | Efectivo, calcula cambio |
| Tarjeta débito | `TARJETA_DEBITO` | Sin cambio |
| Tarjeta crédito | `TARJETA_CREDITO` | Sin cambio |
| Transferencia | `TRANSFERENCIA` | SPEI / transferencia bancaria |
| Crédito cliente | `CREDITO_CLIENTE` | Requiere cliente seleccionado |

### ⚠️ Errores Comunes a Evitar

- **Stock insuficiente:** Si el producto tiene 0 stock, la venta falla con "Stock insuficiente". Primero recibir una compra.
- **Turno cerrado:** Si se intentó vender sin turno, aparece un error. Abrir turno primero.
- **Monto insuficiente (efectivo):** El monto recibido debe ser ≥ al total. Usar los botones rápidos: $50, $100, $200, $500, $1000.
- **Pago mixto:** Si el cliente paga parte efectivo + parte tarjeta, usar botón "Pago mixto".
- **Precios como string:** *(Bug corregido)* Los precios de Prisma Decimal se convertían a strings; ya se aplica `Number()`.

### Datos de Prueba Usados

```
Venta VTA-2026-00001 (curl):
  Producto: Coca-Cola 600ml × 2 @ $18.00
  Total:    $36.00
  Pago:     EFECTIVO $50.00
  Cambio:   $14.00

Venta VTA-2026-00002 (POS UI):
  Producto: Coca-Cola 600ml × 2 @ $18.00
  Total:    $36.00
  Pago:     EFECTIVO $36.00 (exacto)
  Cambio:   $0.00
```

---

## Módulo: Entregas

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Orden ID** | ✅ Sí | CUID | — | ID de orden completada |
| **Dirección entrega** | ✅ Sí | Texto | 5–500 chars | `Av. Insurgentes Sur 1234, CDMX` |
| Asignado a | ❌ | CUID usuario | — | ID de usuario REPARTIDOR |
| Programada en | ❌ | Fecha/hora | — | `2026-03-08T10:00:00` |
| Notas | ❌ | Texto | — | `Entregar en recepción` |

### Estados de Entrega

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Recién creada |
| `ASIGNADO` | Repartidor asignado |
| `EN_RUTA` | Repartidor en camino |
| `ENTREGADO` | Entregada exitosamente |
| `NO_ENTREGADO` | No se pudo entregar |
| `REPROGRAMADO` | Se reprogramó la fecha |

### ⚠️ Errores Comunes a Evitar

- **Dirección muy corta:** Mínimo 5 caracteres. Incluir calle, número, colonia y CP.
- **Orden no completada:** Solo se pueden crear entregas de órdenes con estado `COMPLETADA`.
- **Sin repartidores:** Si no hay usuarios con rol `REPARTIDOR`, la entrega quedará sin asignar.
- **Las entregas se crean desde la API**, no hay botón "Nueva entrega" en la interfaz web (se crean al procesar órdenes con entrega a domicilio).

### Datos de Prueba Usados

```
Orden:     VTA-2026-00002
Dirección: Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, CP 03100
Notas:     Entregar en recepción, preguntar por Sr. López
Estado:    ASIGNADO
```

---

## Módulo: Usuarios

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Nombre completo** | ✅ Sí | Texto | 2–100 chars | `Miguel Ángel Hernández Ruiz` |
| **Correo** | ✅ Sí | Email | válido | `miguel.hernandez@minegocio.com` |
| **Contraseña** | ✅ Sí | Texto | mín. 8 chars | `Repartidor2026!` |
| **Rol** | ✅ Sí | Select | enum | `REPARTIDOR` |
| Teléfono | ❌ | Texto | 7–20 chars | `5567891234` |

### Roles Disponibles

| Rol | Permisos |
|-----|----------|
| `ADMIN` | Acceso total: usuarios, reportes, configuración, POS |
| `CAJERO` | POS, órdenes, inventario, clientes |
| `REPARTIDOR` | Entregas asignadas, actualizar estado |

### ⚠️ Errores Comunes a Evitar

- **Correo duplicado:** No se puede registrar un correo que ya existe en la empresa.
- **Contraseña débil:** Mínimo 8 caracteres. Recomendación: incluir mayúscula + número + símbolo.
  - ✅ `Repartidor2026!`
  - ❌ `12345678` (muy simple)
  - ❌ `pass` (muy corta)
- **Nombre muy corto:** Mínimo 2 caracteres. Usar nombre completo.
- **Teléfono:** 7 a 20 caracteres. Solo números, sin formato.
- **Horario:** Si se usa, formato `HH:MM` (24 horas).
  - ✅ `08:00`, `14:30`, `22:00`
  - ❌ `8 am`, `2:30 pm`

### Datos de Prueba Usados

```
Nombre:     Miguel Ángel Hernández Ruiz
Correo:     miguel.hernandez@minegocio.com
Contraseña: Repartidor2026!
Rol:        REPARTIDOR
Teléfono:   5567891234
```

---

## Módulo: Clientes

### Campos del Formulario

| Campo | Obligatorio | Tipo | Límite | Ejemplo Válido |
|-------|:-----------:|------|--------|----------------|
| **Nombre** | ✅ Sí | Texto | 2–150 chars | `Juan Pérez López` |
| Teléfono | ❌ | Texto | máx. 20 chars | `5543218765` |
| Correo | ❌ | Email | válido | `juan.perez@gmail.com` |
| Dirección | ❌ | Texto | máx. 300 chars | `Calle Reforma 789` |
| RFC | ❌ | Texto | máx. 13 chars | `PELJ850101AB3` |
| Notas | ❌ | Textarea | máx. 1,000 chars | `Cliente frecuente` |
| Límite crédito | ❌ | Decimal | ≥ 0 | `5000.00` |
| Días crédito | ❌ | Entero | 0–365 | `30` |

### ⚠️ Errores Comunes a Evitar

- **RFC persona física:** 13 caracteres: `AAAA######XXX` (4 letras del nombre + 6 dígitos fecha nac. + 3 homoclave).
  - ✅ `PELJ850101AB3`
  - ❌ `pelj850101ab3` (puede ser case-sensitive dependiendo de la implementación)
- **Límite de crédito:** No ingresar valores negativos. El mínimo es 0.
- **Días de crédito:** Entero entre 0 y 365. Es el plazo en días para pagar.
  - ✅ `30` (un mes)
  - ❌ `400` (excede 365)
  - ❌ `-1` (no negativo)
- **Correo duplicado:** Un mismo correo puede pertenecer a un usuario y a un cliente (son entidades separadas).

### Datos de Prueba Usados

```
Nombre:           María García Rodríguez
Teléfono:         5559998877
Correo:           maria.garcia@ejemplo.com
Dirección:        Av. Insurgentes Sur 1234, Col. Del Valle, CDMX
RFC:              GARM901215AB3
Límite crédito:   5000
Días crédito:     30
Notas:            Cliente frecuente, preferencia por pago a crédito
```

---

## Módulo: Inventario

### Funcionalidades Probadas

#### Ajuste Manual de Stock
| Campo | Obligatorio | Tipo | Ejemplo Válido |
|-------|:-----------:|------|----------------|
| **Producto** | ✅ Sí | Select | `Coca-Cola 600ml` |
| **Almacén** | ✅ Sí | Select | `Almacen Principal` |
| **Nueva cantidad** | ✅ Sí | Entero ≥ 0 | `50` |
| **Motivo** | ✅ Sí | Textarea mín. 10 chars | `Conteo fisico de inventario mensual` |

#### Traslado entre Almacenes
| Campo | Obligatorio | Tipo | Ejemplo Válido |
|-------|:-----------:|------|----------------|
| **Producto** | ✅ Sí | Select | `Coca-Cola 600ml` |
| **Almacén origen** | ✅ Sí | Select | `Almacen Principal` |
| **Almacén destino** | ✅ Sí | Select | `Bodega Norte CDMX` |
| **Cantidad** | ✅ Sí | Entero > 0 | `10` |

### Resultado de Pruebas

| Acción | Estado | Detalle |
|--------|--------|---------|
| Ajuste manual | ✅ | Stock 47→50 en Almacen Principal |
| Traslado | ✅ | 10 unidades Almacen Principal → Bodega Norte CDMX |
| Tab Movimientos | ✅ | 9 movimientos visibles (Entrada, Salida venta, Devolución, Ajuste, Traslado) |

### ⚠️ Errores Comunes a Evitar
- **Motivo muy corto:** Mínimo 10 caracteres para ajustes manuales
- **Traslado al mismo almacén:** Origen y destino deben ser diferentes
- **Cantidad mayor al stock:** No se puede trasladar más stock del disponible

---

## Módulo: Reportes

### Tabs Disponibles (todas probadas ✅)

| Tab | Datos Mostrados | Estado |
|-----|----------------|--------|
| **Ventas** | Ventas brutas ($54.00), 1 orden, ticket promedio, utilidad bruta (30.56%), devoluciones | ✅ |
| **Top productos** | Por cantidad vendida y por ingresos (Coca-Cola 600ml: 3 qty, $54.00) | ✅ |
| **Métodos de pago** | Desglose: Efectivo 1 transacción $54.00 (100%) | ✅ |
| **Inventario** | Valor total $625.00, por almacén y por categoría | ✅ |
| **Cajeros** | Rendimiento: Administrador (1 orden, $54.00), Cajero Principal (0) | ✅ |
| **Entregas** | Total entregas: 1, tasa de éxito 0%, desglose por repartidor | ✅ |

### Filtros
- Rango de fechas configurable (Desde / Hasta)
- Botón "Aplicar" para refrescar datos

---

## Módulo: Configuración

### Tab: Mi perfil
Muestra datos del usuario logueado: nombre, correo, rol, teléfono, empresa, moneda, tasa impuesto, horario, días laborales, último login, miembro desde.

### Tab: Seguridad — Cambiar PIN de usuario

| Campo | Obligatorio | Tipo | Ejemplo Válido |
|-------|:-----------:|------|----------------|
| **Usuario** | ✅ Sí | Select (combobox) | `Cajero Principal (CAJERO)` |
| **Nuevo PIN** | ✅ Sí | Texto 4-6 dígitos | `1234` |
| **Confirmar PIN** | ✅ Sí | Texto (debe coincidir) | `1234` |

### ⚠️ Errores Comunes a Evitar
- **PIN no coincide:** Ambos campos deben tener el mismo valor
- **PIN muy corto/largo:** Debe ser entre 4 y 6 dígitos

### Datos de Prueba Usados
```
Usuario:       Cajero Principal (CAJERO)
Nuevo PIN:     1234
Confirmar PIN: 1234
Resultado:     "PIN actualizado exitosamente"
```

---

## Módulo: Dashboard

### KPIs Mostrados (todos correctos ✅)

| KPI | Valor | Detalle |
|-----|-------|---------|
| Ventas hoy | $54.00 | 1 orden, ticket $54.00 |
| Ventas del mes | $54.00 | +0.0% vs mes anterior |
| Utilidad bruta | $16.50 | Margen 30.6% |
| Productos stock bajo | 1 | Requieren reposición |
| Cotizaciones pendientes | 0 | Valor: $0.00 |
| Devoluciones (mes) | 2 | $72.00, hoy: 2 |
| Compras del mes | $696.00 | 1 orden de compra |
| Entregas pendientes | 1 | Turnos abiertos: 1 |

- Botón "Actualizar" para refrescar datos
- Muestra hora de última actualización y sesiones activas

---

## Módulo: Autenticación

### Login

| Campo | Obligatorio | Tipo | Ejemplo |
|-------|:-----------:|------|---------|
| **Correo** | ✅ | Email | `admin@minegocio.com` |
| **Contraseña** | ✅ | Texto | `Admin12345` |

### Registro de Empresa

| Campo | Obligatorio | Tipo | Ejemplo |
|-------|:-----------:|------|---------|
| **Nombre empresa** | ✅ | Texto | `Mi Tienda S.A.` |
| **Nombre usuario** | ✅ | Texto | `Carlos López` |
| **Correo** | ✅ | Email | `carlos@mitienda.com` |
| **Contraseña** | ✅ | Texto (mín. 8) | `MiTienda2026!` |

### ⚠️ Errores Comunes a Evitar

- **Correo no existe:** Si el correo no está registrado, el error es genérico por seguridad.
- **Contraseña incorrecta:** Verificar mayúsculas/minúsculas. Las contraseñas son case-sensitive.
- **Sesión expirada:** Los tokens expiran después de 8 horas. Reloguear si aparece error 401.
- **Registro:** El correo debe ser único en todo el sistema (no solo por empresa).

---

## Errores Comunes del Usuario

### 📋 Tabla de Validaciones Rápida

| Qué NO hacer | Por qué falla | Qué hacer |
|---------------|---------------|-----------|
| Ingresar `$18.00` en precio | El `$` no es numérico | Ingresar solo `18.00` |
| Poner `16` en tasa impuesto | Se interpreta como 1600% | Poner `0.16` para 16% |
| Escribir `CAJA-01` en turno | Ahora es dropdown | Seleccionar la caja de la lista |
| RFC con guiones `DNA-090101-AB3` | Formato incorrecto | Sin guiones: `DNA090101AB3` |
| Correo sin @ `adminminegocio` | No es email válido | `admin@minegocio.com` |
| Contraseña `12345` | Muy corta (mín. 8) | `Admin12345` o más compleja |
| Teléfono `(55) 1234-5678` | Paréntesis y guiones | Solo números: `5512345678` |
| Color `rojo` o `FF5733` | No es hex válido | Con #: `#FF5733` |
| Crear compra sin productos | Mínimo 1 producto | Añadir al menos un producto |
| Vender sin turno abierto | POS requiere turno activo | Abrir turno en Turnos de Caja |
| Vender sin stock | Producto con 0 existencias | Recibir una compra primero |
| Horario `8 am` | Formato inválido | Usar `08:00` (24h) |
| Días crédito `400` | Máximo 365 | Ingresar 0–365 |
| Límite de productos 200 | Backend max = 100 | Máximo 100 en consultas |

### 🔑 Formatos Clave

| Dato | Formato Correcto | Ejemplo |
|------|-----------------|---------|
| Email | `usuario@dominio.com` | `admin@minegocio.com` |
| RFC Moral | 12 chars: `AAA######XX` | `DNA090101AB` |
| RFC Físico | 13 chars: `AAAA######XXX` | `PELJ850101AB3` |
| Teléfono | 7-20 dígitos numéricos | `5551234567` |
| Color Hex | `#RRGGBB` | `#FF5733` |
| Tasa IVA | Decimal 0–1 | `0.16` |
| Horario | `HH:MM` (24h) | `08:00` |
| SKU | 1-50 chars alfanum. | `BEB-CC-600` |
| Código barras | Hasta 50 chars numéricos | `7501055300120` |
| Factura | Hasta 100 chars libres | `FAC-2026-0001` |
| Fecha | ISO: `YYYY-MM-DD` | `2026-03-07` |

---

## Flujo Completo de Prueba (Paso a Paso)

Para probar el sistema de principio a fin, seguir este orden (respetar dependencias):

### Paso 1: Login
```
Correo:     admin@minegocio.com
Contraseña: Admin12345
```

### Paso 2: Crear Proveedor
```
Ir a: Proveedores → Nuevo proveedor
Nombre: Distribuidora Nacional S.A. de C.V.
RFC:    DNA090101AB3
```

### Paso 3: Crear Categoría
```
Ir a: Categorías → Nueva categoría
Nombre: Abarrotes
Color:  #FF5733
Ícono:  local_grocery_store
```

### Paso 4: Crear Almacén (opcional, ya existe uno del seed)
```
Ir a: Almacenes → Nuevo almacén
Nombre:    Bodega Norte CDMX
Dirección: Blvd. Manuel Ávila Camacho 456
```

### Paso 5: Crear Producto
```
Ir a: Productos → Nuevo producto
Pestaña General:
  SKU: BEB-CC-600, Nombre: Coca-Cola 600ml
  Código barras: 7501055300120
  Categoría: Abarrotes, Proveedor: Distribuidora Nacional
Pestaña Precios:
  Costo: 12.50, Venta 1: 18.00, Venta 2: 16.50
  Tasa impuesto: 0.16 (incluido)
Pestaña Inventario:
  Stock mín: 10, Stock máx: 200
  Rastrear inventario: Sí
```

### Paso 6: Crear Compra y Recibir Mercancía
```
Ir a: Compras → Nueva compra
Proveedor: Distribuidora Nacional
Factura:   FAC-2026-0001
Producto:  Coca-Cola 600ml, Cantidad: 48, Costo: 12.50

⚠️ IMPORTANTE: Después de crear, hacer clic en "Recibir" 
   y seleccionar almacén destino para que el stock se actualice.
```

### Paso 7: Abrir Turno de Caja
```
Ir a: Turnos de Caja → Abrir turno
Seleccionar caja del dropdown (ej: "Caja 1")
Monto apertura: 1500.00
```

### Paso 8: Realizar Venta en POS
```
Ir a: Punto de Venta
Clic en "Coca-Cola 600ml" (se agrega al carrito)
Clic en "+" para aumentar cantidad a 2
Clic en "COBRAR $36.00"
Seleccionar "Efectivo" → Clic en "$50"
Cambio mostrado: $14.00
Clic en "Confirmar cobro"
✅ Ticket: VTA-2026-XXXXX
```

### Paso 9: Crear Entrega (vía API)
```
POST /api/v1/entregas
{
  "ordenId": "[ID de la orden completada]",
  "direccionEntrega": "Av. Insurgentes Sur 1234, CDMX, CP 03100",
  "notas": "Entregar en recepción"
}
```

### Paso 10: Cerrar Turno
```
Ir a: Turnos de Caja → Cerrar turno
Contar efectivo en caja y reportar monto real.
Monto cierre: [total real en caja]
El sistema calcula la diferencia automáticamente.
```

### Paso 11: Realizar Devolución
```
Ir a: Órdenes → Clic en una orden COMPLETADA
Clic en botón "Devolver"
Seleccionar productos a devolver y cantidad
Indicar motivo de la devolución
Clic en "Procesar devolución"
✅ "Devolución procesada" — stock se reintegra automáticamente
```

### Paso 12: Ajuste Manual de Inventario
```
Ir a: Inventario → Clic en "Ajuste manual"
Seleccionar producto y almacén
Ingresar nueva cantidad
Motivo: mínimo 10 caracteres (ej: "Conteo fisico de inventario mensual")
Clic en "Aplicar ajuste"
```

### Paso 13: Traslado de Inventario
```
Ir a: Inventario → Clic en "Traslado"
Seleccionar producto, almacén origen, almacén destino
Ingresar cantidad a trasladar
Clic en "Realizar traslado"
✅ Stock se mueve entre almacenes
```

### Paso 14: Revisar Reportes
```
Ir a: Reportes
Configurar rango de fechas si es necesario → Clic en "Aplicar"
Revisar las 6 tabs: Ventas, Top productos, Métodos de pago, Inventario, Cajeros, Entregas
```

### Paso 15: Cambiar PIN de Usuario
```
Ir a: Configuración → Pestaña "Seguridad"
Seleccionar usuario del dropdown
Ingresar nuevo PIN (4-6 dígitos) y confirmarlo
Clic en "Cambiar PIN"
✅ "PIN actualizado exitosamente"
```

---

## Cuentas de Prueba del Seed

| Correo | Contraseña | Rol | Empresa |
|--------|-----------|-----|---------|
| `admin@minegocio.com` | `Admin12345` | ADMIN | Mi Negocio Demo |
| `cajero@minegocio.com` | `Cajero12345` | CAJERO | Mi Negocio Demo |
| `miguel.hernandez@minegocio.com` | `Repartidor2026!` | REPARTIDOR | Mi Negocio Demo |

---

## Notas Técnicas

- **IDs internos:** El sistema usa CUIDs (ej: `cmmfp9ar10008nxoq5lyt5mlm`). Los usuarios nunca necesitan ingresarlos — todos los formularios ahora usan dropdowns.
- **Multi-tenant:** Cada empresa tiene sus datos aislados. Un usuario de "Mi Negocio Demo" no ve datos de "Tienda de Prueba S.A."
- **Prisma Decimal:** Los campos de precio en la BD son `Decimal`. Se serializan como strings en JSON. El backend usa `z.coerce.number()` y el frontend `Number()` para convertir.
- **Paginación:** El listado máximo por página es 100 registros (`limite` max=100 en todos los schemas de filtro).
- **Sesiones:** El token JWT expira en 8 horas. Máximo de sesiones activas configurable.
- **Bugs totales corregidos:** 5 (ver sección Bugs Encontrados y Corregidos)
