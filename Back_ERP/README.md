# ERP Backend

Backend API REST para el sistema ERP, construido con Node.js 20, Express.js, TypeScript, Prisma y PostgreSQL.

## 🚀 Quick Start

### Instalación

```bash
# Las dependencias ya están instaladas
npm install  # Si ejecuta en una máquina nueva

# Crear archivo .env con las variables necesarias
cp .env.example .env
```
a
### Variables de Entorno

Editar `.env`:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/erp_db?connection_limit=20&pool_timeout=10
JWT_SECRET=tu_clave_secreta_aqui
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
REQUEST_TIMEOUT_MS=30000
PRISMA_QUERY_TIMEOUT_MS=30000
```

### Ejecutar en Desarrollo

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

### Compilar y Ejecutar en Producción

```bash
npm run build
npm start
```

## 📦 Stack Tecnológico

| Componente | Librería | Versión |
|-----------|----------|---------|
| Runtime | Node.js | 20 LTS |
| Lenguaje | TypeScript | 5.x |
| Framework | Express.js | 4.x |
| Validación | Zod | 3.x |
| ORM | Prisma | 5.x |
| Autenticación | JWT + Bcrypt | 9 / 5 |
| Documentación | Swagger UI | 5.x |
| Base de Datos | PostgreSQL | 16 |

## 📚 API Endpoints (Ejemplo)

### Health Check
```
GET /api/health
```

### Autenticación - Generar Token JWT
```
POST /api/auth/token
```

### Autenticación - Hash de Contraseña
```
POST /api/auth/hash
```

### Validación - Validar Usuario con Zod
```
POST /api/validate/user
```

### Documentación Swagger
```
GET /api-docs
```

## 🔧 Estructura del Proyecto

```
Back_ERP/
├── src/
│   ├── index.ts           # Punto de entrada (ejemplo)
│   ├── controllers/        # Controladores HTTP
│   ├── services/           # Lógica de negocio
│   ├── repositories/       # Acceso a datos
│   ├── middleware/         # Middlewares Express
│   ├── schemas/            # Validaciones Zod
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Utilidades
├── prisma/
│   └── schema.prisma      # Esquema de BD (crear)
├── dist/                   # Código compilado
├── node_modules/           # Dependencias
├── tsconfig.json          # Config TypeScript
├── package.json           # Config NPM
├── .env.example           # Template variables
├── .gitignore             # Archivos ignorados
└── README.md              # Este archivo
```

## 🔐 Seguridad

- ✅ JWT para autenticación stateful
- ✅ Bcrypt para hash de contraseñas
- ✅ TypeScript para type-safety
- ✅ Validación con Zod (DTOs type-safe)
- ✅ CORS configurado (cuando sea necesario)

## 🗄️ Base de Datos

### Crear Base de Datos PostgreSQL

```sql
CREATE DATABASE erp_db;
```

### Prisma Setup

```bash
# Inicializar Prisma (si no está hecho)
npx prisma init

# Ejecutar migraciones
npx prisma migrate dev --name init

# Abrir Prisma Studio
npx prisma studio
```

## 📝 Patrones de Código

### Controller-Service-Repository Pattern

**Controller**: Maneja requests/responses HTTP
```typescript
app.get('/api/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
});
```

**Service**: Contiene lógica de negocio
```typescript
class UserService {
  async getUserById(id: string) {
    return await userRepository.findById(id);
  }
}
```

**Repository**: Accede a la base de datos
```typescript
class UserRepository {
  async findById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }
}
```

### Validación con Zod

```typescript
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
});

type CreateUserDTO = z.infer<typeof CreateUserSchema>;

app.post('/api/users', (req, res) => {
  const data = CreateUserSchema.parse(req.body);
  // ...
});
```

## 🧪 Testing (Preparado para)

```bash
npm test
```

Actualizar `package.json` scripts para agregar:
- Jest para unit tests
- Supertest para API testing
- Prisma test database

## 📖 Documentación API (Swagger)

La documentación interactiva está disponible en:
```
http://localhost:3000/api-docs
```

Para agregar endpoints a Swagger, usar comentarios JSDoc o decoradores.

## 🚨 Troubleshooting

### Puerto en uso
```bash
# Change PORT in .env or:
PORT=3001 npm run dev
```

### Error de base de datos
```bash
# Verificar conexión PostgreSQL
psql $DATABASE_URL

# Crear base de datos
createdb erp_db
```

### TypeScript errors
```bash
npm run build  # Véase errores de compilación
```

## 📋 Checklist Pre-Production

- [ ] Variables de entorno configuradas
- [ ] Base de datos PostgreSQL creada
- [ ] Prisma schema definido y migraciones ejecutadas
- [ ] JWT_SECRET fuerte (mínimo 32 caracteres)
- [ ] CORS configurado correctamente
- [ ] Rate limiting implementado
- [ ] Logging configurado
- [ ] Tests completos
- [ ] SSL/HTTPS habilitado
- [ ] Monitoreo y alertas configurados

## 📞 Soporte

Para issues, contactar al equipo de desarrollo o revisar los logs en:
```bash
npm run dev  # Ver logs en consola
```

---

**Última actualización**: 24 de febrero de 2026
