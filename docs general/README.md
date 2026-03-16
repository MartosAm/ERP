# ERP - Guía de Inicio Rápido

## Descripción General
Sistema ERP/POS completo para PyMEs con stack Node.js 20 + PostgreSQL 16 + Angular 17. Gestiona inventario, ventas, usuarios, reportes, etc.

## Arquitectura
- **Backend**: API REST con Express + TypeScript + Prisma
- **Frontend**: SPA con Angular 17 + Material Design
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Infraestructura**: Docker para servicios

## Inicio Rápido (Todo en Orden)

### 1. Requisitos
```bash
# Node.js 20 (obligatorio para backend)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Docker (opcional, para BD)
# Ya instalado en tu sistema
```

### 2. Levantar Base de Datos
```bash
cd Back_ERP
docker compose up -d
# Esperar a que PostgreSQL esté listo
```

### 3. Configurar Backend
```bash
cd Back_ERP
npm install
cp .env.example .env
npm run db:migrate
npm run db:generate
npm run db:seed
```

### 4. Levantar Backend
```bash
npm run dev
# API disponible en http://localhost:3001
```

### 5. Levantar Frontend
```bash
cd ../Front_ERP-1
npm install
npm start
# App disponible en http://localhost:4200
```

### 6. Verificar Todo Funcionando
- **API Health**: http://localhost:3001/api/health
- **Swagger Docs**: http://localhost:3001/api-docs
- **Prisma Studio**: `npm run db:studio` → http://localhost:5555
- **Frontend**: http://localhost:4200

## Credenciales de Prueba
- **Admin**: admin@minegocio.com / Admin12345
- **Cajero**: cajero@minegocio.com / Cajero12345

## Documentación Detallada
- [📊 Prisma (Base de Datos)](README_Prisma.md)
- [🐳 Docker (Contenedores)](deploy/README_Docker.md)
- [🚀 Backend (API)](README_Backend.md)
- [💻 Frontend (Angular)](README_Frontend.md)

## Comandos Útiles
```bash
# Ver estado de servicios
docker compose ps

# Ver logs
docker compose logs -f

# Resetear base de datos
npm run db:reset

# Tests completos
npm run test:e2e
```

## Troubleshooting
- **Docker permission denied**: `sudo usermod -aG docker $USER` y reiniciar sesión
- **Puerto ocupado**: Cambiar puertos en .env o docker-compose.yml
- **Node version**: `nvm use 20` en cada terminal
- **BD connection**: Verificar `DATABASE_URL` en .env

## Producción
Para desplegar en producción, ver documentación específica de cada componente. Requiere configuración de variables de entorno, SSL, backups, etc.

---
**Versión**: 1.0.0
**Última actualización**: Marzo 2026</content>
<parameter name="filePath">/home/adrian/Documentos/proyectos/ERP/docs general/README.md



cd /home/adrian/Documentos/proyectos/ERP/Back_ERP && docker compose ps
sudo usermod -aG docker $USER
source ~/.bashrc && nvm use 20 && npm run db:studio
newgrp docker
cd /home/adrian/Documentos/proyectos/ERP/Back_ERP && docker compose up -d
cd /home/adrian/Documentos/proyectos/ERP/Back_ERP && source ~/.bashrc && nvm use 20 && npm run db:studio