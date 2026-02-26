/**
 * prisma/seed.ts
 * ------------------------------------------------------------------
 * Datos iniciales para desarrollo y pruebas.
 *
 * Crea:
 * - 1 Empresa de prueba
 * - 1 Usuario ADMIN con credenciales conocidas
 * - 1 Almacen principal
 * - 1 Caja registradora
 *
 * Ejecutar: npm run db:seed
 * ------------------------------------------------------------------
 */

import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de datos...');

  // 1. Crear empresa de prueba
  const empresa = await prisma.empresa.upsert({
    where: { rfc: 'XAXX010101000' },
    update: {},
    create: {
      nombre: 'Mi Negocio Demo',
      rfc: 'XAXX010101000',
      direccion: 'Calle Principal #123, Ciudad',
      telefono: '5551234567',
      correo: 'contacto@minegocio.com',
      tasaImpuesto: 0.16,
      moneda: 'MXN',
      activo: true,
    },
  });
  console.log(`Empresa creada: ${empresa.nombre} (${empresa.id})`);

  // 2. Crear usuario ADMIN
  const hashContrasena = await bcrypt.hash('Admin12345', 12);
  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@minegocio.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Administrador',
      correo: 'admin@minegocio.com',
      hashContrasena,
      rol: Rol.ADMIN,
      activo: true,
      telefono: '5559876543',
    },
  });
  console.log(`Usuario ADMIN creado: ${admin.correo} / Admin12345`);

  // 3. Crear usuario CAJERO de prueba
  const hashCajero = await bcrypt.hash('Cajero12345', 12);
  const cajero = await prisma.usuario.upsert({
    where: { correo: 'cajero@minegocio.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Cajero Principal',
      correo: 'cajero@minegocio.com',
      hashContrasena: hashCajero,
      rol: Rol.CAJERO,
      activo: true,
      horarioInicio: '08:00',
      horarioFin: '22:00',
      diasLaborales: [0, 1, 2, 3, 4, 5, 6], // Todos los dias
    },
  });
  console.log(`Usuario CAJERO creado: ${cajero.correo} / Cajero12345`);

  // 4. Crear almacen principal
  const almacen = await prisma.almacen.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Almacen Principal',
      direccion: 'Calle Principal #123',
      esPrincipal: true,
      activo: true,
    },
  });
  console.log(`Almacen creado: ${almacen.nombre}`);

  // 5. Crear caja registradora
  const caja = await prisma.cajaRegistradora.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Caja 1',
      activo: true,
    },
  });
  console.log(`Caja registradora creada: ${caja.nombre}`);

  console.log('\nSeed completado exitosamente.');
  console.log('---');
  console.log('Credenciales de prueba:');
  console.log('  ADMIN:  admin@minegocio.com / Admin12345');
  console.log('  CAJERO: cajero@minegocio.com / Cajero12345');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
