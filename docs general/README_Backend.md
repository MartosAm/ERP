# README - Backend (API REST)

## Descripción
Backend del ERP construido con Node.js 20, Express, TypeScript y Prisma. Proporciona API REST para gestión de inventario, ventas, usuarios, etc.

## Requisitos Previos
- Node.js >= 20 (instalar con nvm)
- PostgreSQL corriendo (Docker o local)
- Base de datos configurada con Prisma

## Comandos Básicos

### Desarrollo
```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo (con hot-reload)
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm run start
```

### Base de Datos
```bash
# Migrar esquema
npm run db:migrate

# Generar cliente Prisma
npm run db:generate

# Cargar datos iniciales
npm run db:seed

# Abrir Prisma Studio
npm run db:studio
```

### Qué Hace Cada Comando
- **`npm run dev`**: Inicia servidor con tsx (hot-reload), puerto 3001 por defecto
- **`npm run build`**: Compila TypeScript a JavaScript en carpeta `dist/`
- **`npm run start`**: Ejecuta código compilado en producción
- **`npm run db:migrate`**: Aplica cambios de esquema a BD
- **`npm run db:generate`**: Crea cliente Prisma tipado
- **`npm run db:seed`**: Inserta datos de prueba
- **`npm run db:studio`**: Interfaz web para BD en `http://localhost:5555`

## Comandos Avanzados

### Testing y Calidad
```bash
# Ejecutar tests
npm test

# Tests con watch mode
npm run test:watch

# Tests de CI (sin watch)
npm run test:ci

# Tests end-to-end
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Producción
```bash
# Build y start combinado
npm run build && npm run start

# Start con variables de producción
NODE_ENV=production npm run start

# Start con puerto personalizado
PORT=3002 npm run start
```

### Gestión de BD Avanzada
```bash
# Reset BD completa
npm run db:reset

# Push schema sin migración (desarrollo)
npm run db:push

# Deploy migraciones en prod
npm run db:migrate:deploy
```

### Qué Hace Cada Comando Avanzado
- **`npm test`**: Ejecuta tests con Jest (unitarios + integración)
- **`npm run test:watch`**: Tests en modo watch (se ejecutan al cambiar archivos)
- **`npm run test:ci`**: Tests para CI/CD (con coverage)
- **`npm run test:e2e`**: Tests end-to-end con script `test-flujo-completo.sh`
- **`npm run typecheck`**: Verifica tipos TypeScript sin compilar
- **`npm run lint`**: Ejecuta ESLint para calidad de código
- **`npm run db:reset`**: Borra todo y re-inicia BD desde cero
- **`npm run db:push`**: Sincroniza schema con BD sin versionar
- **`npm run db:migrate:deploy`**: Aplica migraciones en producción

## Pasos para Tener Todo en Orden

### 1. Primera Configuración
```bash
# 1. Instalar Node.js 20 con nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# Editar DATABASE_URL y otras variables

# 4. Preparar base de datos
npm run db:migrate
npm run db:generate
npm run db:seed

# 5. Verificar build
npm run build

# 6. Probar servidor
npm run dev
```

### 2. Desarrollo Diario
```bash
# Levantar servidor
npm run dev

# En otra terminal, verificar API
curl http://localhost:3001/api/health

# Si cambias schema.prisma
npm run db:migrate && npm run db:generate
```

### 3. Testing
```bash
# Ejecutar todos los tests
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

### 4. Troubleshooting
- **Puerto ocupado**: Cambiar PORT en .env o usar `PORT=3002 npm run dev`
- **Error de BD**: Verificar PostgreSQL corriendo y DATABASE_URL correcta
- **Tipos desactualizados**: `npm run db:generate`
- **Dependencias**: `rm -rf node_modules && npm install`

### 5. Despliegue a Producción
```bash
# Build
npm run build

# Migrar BD
npm run db:migrate:deploy

# Start
NODE_ENV=production npm run start
```

## Endpoints Principales
- `GET /api/health` - Health check
- `POST /api/auth/login` - Autenticación
- `GET /api/productos` - Listar productos
- `POST /api/ordenes` - Crear orden
- Documentación completa en `http://localhost:3001/api-docs` (Swagger)

## Archivos Importantes
- `src/server.ts` - Punto de entrada
- `src/app.ts` - Configuración Express
- `prisma/schema.prisma` - Esquema de BD
- `.env` - Variables de entorno
- `package.json` - Dependencias y scripts
