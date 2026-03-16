# README - Frontend (Angular)

## Descripción
Frontend del ERP construido con Angular 17, Angular Material y TailwindCSS. Interfaz de usuario para gestión de ventas, inventario, reportes, etc.

## Requisitos Previos
- Node.js >= 18 (Angular CLI requiere mínimo 18)
- Backend corriendo en puerto 3001 (o configurado)
- Puerto 4200 libre

## Comandos Básicos

### Desarrollo
```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo (con hot-reload)
npm start

# Construir para producción
npm run build

# Construir y observar cambios
npm run watch
```

### Qué Hace Cada Comando
- **`npm start`**: Inicia `ng serve` en puerto 4200, abre navegador automáticamente
- **`npm run build`**: Compila aplicación para producción en carpeta `dist/`
- **`npm run watch`**: Construye en modo watch para desarrollo (sin servidor)

## Comandos Avanzados

### Angular CLI
```bash
# Generar componentes
ng generate component nombre-componente

# Generar servicios
ng generate service nombre-servicio

# Generar módulos
ng generate module nombre-modulo

# Generar guards
ng generate guard nombre-guard
```

### Build y Optimización
```bash
# Build para desarrollo
ng build

# Build para producción con optimizaciones
ng build --configuration production

# Build con service worker (PWA)
ng build --configuration production --service-worker

# Analizar bundle
ng build --stats-json && npx webpack-bundle-analyzer dist/front-erp/stats.json
```

### Testing
```bash
# Ejecutar tests unitarios
ng test

# Ejecutar tests e2e
ng e2e

# Tests con coverage
ng test --code-coverage
```

### Debugging
```bash
# Ver configuración
ng config

# Ver versión
ng version

# Limpiar cache
ng cache clean
```

### Qué Hace Cada Comando Avanzado
- **`ng generate`**: Crea archivos y actualiza módulos automáticamente
- **`ng build --configuration production`**: Optimiza CSS/JS, minifica, tree-shaking
- **`ng test`**: Ejecuta tests con Karma/Jasmine
- **`ng e2e`**: Tests end-to-end (requiere configuración)
- **`ng cache clean`**: Limpia cache de Angular CLI

## Pasos para Tener Todo en Orden

### 1. Primera Configuración
```bash
# 1. Instalar Node.js (si no tienes)
# Angular requiere Node >= 18
node --version  # Debe ser >= 18

# 2. Instalar dependencias
npm install

# 3. Verificar Angular CLI
npx ng version

# 4. Configurar entorno (opcional)
# Editar src/environments/environment.ts si es necesario

# 5. Levantar servidor
npm start
```

### 2. Desarrollo Diario
```bash
# Levantar frontend
npm start

# El navegador se abre automáticamente en http://localhost:4200

# Si cambias configuración, reiniciar
# Ctrl+C y npm start
```

### 3. Build para Producción
```bash
# Construir optimizado
npm run build

# Los archivos listos están en dist/front-erp/

# Para servir estáticamente (ejemplo con nginx)
# Copiar dist/front-erp/* a carpeta de nginx
```

### 4. Troubleshooting
- **Puerto ocupado**: Cambiar puerto con `ng serve --port 4201`
- **CORS errors**: Verificar backend corriendo y CORS_ORIGIN en .env del backend
- **Build falla**: `ng cache clean && npm install`
- **Hot-reload lento**: Verificar Node.js versión y RAM disponible

### 5. Despliegue
```bash
# Build optimizado
npm run build

# Los archivos en dist/ se pueden servir con:
# - Nginx
# - Apache
# - Firebase Hosting
# - Vercel
# - Netlify
```

## Estructura del Proyecto
```
src/
├── app/
│   ├── core/          # Servicios singleton, guards
│   ├── features/      # Módulos de funcionalidad
│   ├── layout/        # Layouts, header, sidebar
│   ├── shared/        # Componentes reutilizables
│   └── app.routes.ts  # Configuración de rutas
├── assets/            # Imágenes, íconos
├── environments/      # Config por entorno
└── styles/            # CSS global
```

## Endpoints del Backend
- Base URL: `http://localhost:3001/api`
- Auth: `/auth/login`
- Productos: `/productos`
- Órdenes: `/ordenes`
- Usuarios: `/usuarios`

## Archivos Importantes
- `angular.json` - Configuración de Angular CLI
- `src/environments/` - Variables por entorno
- `src/app/app.config.ts` - Configuración de la app
- `src/app/app.routes.ts` - Definición de rutas
- `package.json` - Dependencias y scripts
