# README - Prisma (Base de Datos)

## Descripción
Prisma es el ORM (Object-Relational Mapping) que gestiona la base de datos PostgreSQL del ERP. Conecta tu código TypeScript con la BD, genera migraciones, y proporciona un cliente tipado para queries.

## Requisitos Previos
- PostgreSQL corriendo (local o Docker)
- Node.js >= 20
- Archivo `.env` configurado con `DATABASE_URL`

## Comandos Básicos

### Levantar y Configurar Base de Datos
```bash
# Aplicar migraciones (crea tablas desde schema.prisma)
npm run db:migrate

# Generar cliente Prisma (autocompletado TypeScript)
npm run db:generate

# Cargar datos iniciales (seed)
npm run db:seed

# Abrir interfaz web para ver/editar datos
npm run db:studio
```

### Qué Hace Cada Comando
- **`npm run db:migrate`**: Crea/aplica cambios en el esquema de BD. Genera archivos SQL versionados en `prisma/migrations/`
- **`npm run db:generate`**: Regenera el cliente Prisma con tipos actualizados. Necesario después de cambiar `schema.prisma`
- **`npm run db:seed`**: Ejecuta `prisma/seed.ts` para insertar datos de prueba (usuarios, productos, etc.)
- **`npm run db:studio`**: Abre navegador en `http://localhost:5555` para inspeccionar datos visualmente

## Comandos Avanzados

### Desarrollo Rápido
```bash
# Empujar schema directamente a BD (sin migración) - SOLO DESARROLLO
npm run db:push

# Resetear BD completamente (borra todo y re-aplica)
npm run db:reset
```

### Producción
```bash
# Aplicar migraciones en producción (sin prompts)
npm run db:migrate:deploy
```

### Qué Hace Cada Comando Avanzado
- **`npm run db:push`**: Sincroniza `schema.prisma` con BD sin crear migración. Útil para prototipos, pero no versiona cambios
- **`npm run db:reset`**: Borra todas las tablas, re-ejecuta migraciones y seed. Útil para empezar desde cero
- **`npm run db:migrate:deploy`**: Aplica migraciones pendientes en entornos de producción (no interactivo)

## Pasos para Tener Todo en Orden

### 1. Primera Configuración
```bash
# 1. Asegurar PostgreSQL corriendo
docker compose up -d  # o verificar BD local

# 2. Instalar dependencias
npm install

# 3. Configurar .env (copiar de .env.example)
cp .env.example .env
# Editar DATABASE_URL si es necesario

# 4. Aplicar esquema inicial
npm run db:migrate

# 5. Generar cliente
npm run db:generate

# 6. Cargar datos de prueba
npm run db:seed
```

### 2. Desarrollo Diario
```bash
# Al cambiar schema.prisma
npm run db:migrate  # Crear migración
npm run db:generate # Actualizar tipos

# Para ver datos
npm run db:studio
```

### 3. Troubleshooting
- **Error de conexión**: Verificar `DATABASE_URL` y que PostgreSQL esté corriendo
- **Tipos desactualizados**: Ejecutar `npm run db:generate`
- **Datos corruptos**: `npm run db:reset` (borra todo)

### 4. En Producción
- Nunca usar `db:push` o `db:reset`
- Usar `db:migrate:deploy` para aplicar migraciones
- Backup de BD antes de migraciones importantes

## Archivos Importantes
- `prisma/schema.prisma`: Definición del esquema de BD
- `prisma/seed.ts`: Datos iniciales
- `prisma/migrations/`: Historial de cambios en BD
- `.env`: Variables de entorno (DATABASE_URL)