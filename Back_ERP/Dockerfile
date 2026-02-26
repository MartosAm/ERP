# ============================================================
# Dockerfile — ERP Backend (multi-stage build)
# Produce una imagen minima (~180MB) lista para produccion.
# ============================================================

# ---- Stage 1: Instalar dependencias ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# ---- Stage 2: Compilar TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci && npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ---- Stage 3: Imagen de produccion ----
FROM node:20-alpine AS runner
WORKDIR /app

# Seguridad: no correr como root
RUN addgroup --system --gid 1001 erp && \
    adduser --system --uid 1001 erp

# Copiar dependencias de produccion
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar artefactos compilados
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Variables de entorno por defecto (se sobreescriben en docker-compose/k8s)
ENV NODE_ENV=production
ENV PORT=3001

# Exponer el puerto de la API
EXPOSE 3001

# Health check interno de Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Cambiar a usuario no-root
USER erp

# Comando de inicio: aplicar migraciones y arrancar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
