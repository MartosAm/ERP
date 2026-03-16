# Guia de Levantamiento y Prueba de Middleware (PostgreSQL + Prisma + Backend + Frontend)

Fecha: 2026-03-15
Proyecto: ERP POS
Objetivo: levantar todo el stack local y validar el middleware de autenticacion de forma reproducible, con criterio de ingenieria.

---

## 1. Que vas a aprender

Al finalizar esta guia vas a poder:

1. Levantar base de datos, Prisma, backend y frontend en orden correcto.
2. Entender por que ese orden evita fallos tipicos de arranque.
3. Validar middleware de autenticacion (sin token, token invalido, token valido).
4. Ejecutar pruebas desde DevTools con `fetch` (como haria un front real).
5. Diagnosticar errores comunes de puertos, CORS y credenciales.

---

## 2. Modelo mental (ingenieria)

El sistema tiene esta cadena de dependencias:

1. PostgreSQL: persistencia y fuente de verdad.
2. Prisma: capa ORM y contrato de esquema con la BD.
3. Backend (Express): logica de negocio + middlewares + API.
4. Frontend (Angular): cliente que consume la API.

Regla de oro:
- Si el backend arranca antes de que la BD este disponible, vas a tener errores de conexion.
- Si el frontend arranca antes del backend, veras errores 4xx/5xx en red.
- Si el middleware esta mal, `/auth/perfil` no va a responder correctamente segun token.

---

## 3. Prerrequisitos

En una terminal nueva verifica:

```bash
node -v
npm -v
docker -v
```

Recomendado:
- Node >= 20
- Docker Engine activo

---

## 4. Estructura de carpetas a usar

Raiz del workspace:
- `/home/adrian/Documentos/proyectos/ERP`

Backend:
- `/home/adrian/Documentos/proyectos/ERP/Back_ERP`

Frontend:
- `/home/adrian/Documentos/proyectos/ERP/Front_ERP-1`

---

## 5. Paso a paso operativo

## Paso 1: Base de datos PostgreSQL

Muevete al backend:

```bash
cd /home/adrian/Documentos/proyectos/ERP/Back_ERP
```

Intenta levantar PostgreSQL por Docker Compose:

```bash
POSTGRES_PASSWORD=MAVF2002 docker compose up -d postgres
```

Verifica estado:

```bash
docker compose ps
```

Si el puerto `5432` ya esta en uso, no fuerces un segundo contenedor.
Valida conectividad real con Prisma (eso es mas importante que forzar Docker):

```bash
npx prisma db push
```

Criterio de exito:
- Debe decir algo como `database is already in sync` o aplicar cambios sin error.

---

## Paso 2: Prisma (cliente + esquema + seed)

Genera cliente Prisma:

```bash
npx prisma generate
```

Sincroniza esquema:

```bash
npx prisma db push
```

Carga datos semilla:

```bash
npm run db:seed
```

Credenciales de prueba esperadas:
- `admin@minegocio.com / Admin12345`
- `cajero@minegocio.com / Cajero12345`

Criterio de exito:
- Debes ver mensaje `Seed completado exitosamente`.

---

## Paso 3: Levantar backend

```bash
npm run dev
```

Backend esperado en:
- `http://localhost:3001`

Health check:

```bash
curl -i http://localhost:3001/api/health
```

Criterio de exito:
- HTTP `200` y JSON con `estado: activo`.

Nota si sale `EADDRINUSE: 3001`:
- Ya hay una instancia backend corriendo. No necesitas otra.

---

## Paso 4: Levantar frontend

En otra terminal:

```bash
cd /home/adrian/Documentos/proyectos/ERP/Front_ERP-1
npm run start
```

Frontend esperado en:
- `http://localhost:4200`

Criterio de exito:
- Angular compila y muestra `Local: http://localhost:4200/`.

---

## 6. Prueba didactica del middleware de autenticacion

Este middleware protege rutas como:
- `GET /api/v1/auth/perfil`

Contrato esperado del middleware:

1. Sin `Authorization`: HTTP `401`, mensaje `Token requerido`.
2. Con token invalido: HTTP `401`, mensaje `Token invalido o expirado`.
3. Con token valido: HTTP `200`, perfil del usuario autenticado.

---

## 7. Prueba desde DevTools (Console del navegador)

Abre `http://localhost:4200` en navegador.
Luego abre DevTools:
- Chrome/Edge: `F12` o `Ctrl+Shift+I`
- Pestaña `Console`

### 7.1 Caso A - Sin token

```javascript
const r = await fetch('http://localhost:3001/api/v1/auth/perfil');
console.log(r.status, await r.json());
```

Verificar:
- `status === 401`
- `error.mensaje === 'Token requerido'`

### 7.2 Caso B - Token invalido

```javascript
const r = await fetch('http://localhost:3001/api/v1/auth/perfil', {
  headers: { Authorization: 'Bearer token-invalido' }
});
console.log(r.status, await r.json());
```

Verificar:
- `status === 401`
- `error.mensaje` contiene `Token invalido o expirado`

### 7.3 Caso C - Login + token valido

```javascript
const login = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    correo: 'admin@minegocio.com',
    contrasena: 'Admin12345'
  })
});

const loginBody = await login.json();
const token = loginBody?.datos?.token;

const perfil = await fetch('http://localhost:3001/api/v1/auth/perfil', {
  headers: { Authorization: `Bearer ${token}` }
});

console.log({
  loginStatus: login.status,
  perfilStatus: perfil.status,
  perfilBody: await perfil.json()
});
```

Verificar:
- `loginStatus === 200`
- `perfilStatus === 200`
- `perfilBody.datos.correo === 'admin@minegocio.com'`

---

## 8. Verificacion extra en Network (DevTools)

En pestaña `Network`:

1. Filtra por `auth`.
2. Ejecuta de nuevo los `fetch`.
3. Revisa por request:

Para `/auth/login`:
- Request headers: `Content-Type: application/json; charset=utf-8`
- Response status: `200`

Para `/auth/perfil`:
- Request headers: `Authorization: Bearer ...`
- Response status: `200` (token valido) o `401` (sin token/invalido)

Esto confirma que middleware y contratos HTTP son correctos extremo a extremo.

---

## 9. Prueba equivalente por terminal (si quieres automatizar)

```bash
cd /home/adrian/Documentos/proyectos/ERP/Back_ERP

TOKEN=$(node -e "(async()=>{const r=await fetch('http://localhost:3001/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({correo:'admin@minegocio.com',contrasena:'Admin12345'})});const j=await r.json();process.stdout.write(j?.datos?.token||'');})().catch(()=>process.exit(1));")

echo "NO TOKEN: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/v1/auth/perfil)"
echo "BAD TOKEN: $(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer token-invalido' http://localhost:3001/api/v1/auth/perfil)"
echo "GOOD TOKEN: $(curl -s -o /dev/null -w '%{http_code}' -H \"Authorization: Bearer $TOKEN\" http://localhost:3001/api/v1/auth/perfil)"
```

Esperado:
- `NO TOKEN: 401`
- `BAD TOKEN: 401`
- `GOOD TOKEN: 200`

---

## 10. Troubleshooting tecnico

## Error: `EADDRINUSE: address already in use :::3001`

Significa que backend ya corre en 3001.
Opciones:

```bash
# Ver quien ocupa 3001
ss -ltnp | grep 3001

# Levantar backend en otro puerto temporal
PORT=3010 npm run dev
```

## Error: `failed to bind ... 5432: address already in use`

Hay otra instancia PostgreSQL en 5432.
No dupliques DB sin necesidad; valida con Prisma:

```bash
npx prisma db push
```

Si conecta, sigue adelante.

## Error CORS en navegador

Verifica en `Back_ERP/.env`:

```env
CORS_ORIGIN=http://localhost:4200
```

Reinicia backend despues de cambiar `.env`.

## Login falla con 401

Verifica seed y credenciales:

```bash
npm run db:seed
```

Luego reintenta login con:
- `admin@minegocio.com / Admin12345`

---

## 11. Criterios de cierre (Definition of Done)

Checklist final:

- [ ] `npx prisma db push` sin error
- [ ] `npm run db:seed` exitoso
- [ ] Backend responde `GET /api/health` con `200`
- [ ] Frontend corriendo en `http://localhost:4200`
- [ ] `/auth/perfil` sin token -> `401`
- [ ] `/auth/perfil` con token invalido -> `401`
- [ ] `/auth/perfil` con token valido -> `200`
- [ ] Verificado en DevTools (Console + Network)

Si todos se cumplen, el middleware esta funcional, robusto y validado como flujo real de usuario.
