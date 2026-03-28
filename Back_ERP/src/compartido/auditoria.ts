import type { Prisma } from '@prisma/client';

type RegistroAuditoriaRepo = {
  create: (args: Prisma.RegistroAuditoriaCreateArgs) => Promise<unknown>;
};

type RegistrarAuditoriaInput = {
  empresaId: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  valoresAnteriores?: Prisma.InputJsonValue;
  valoresNuevos?: Prisma.InputJsonValue;
  direccionIp?: string | null;
};

export async function registrarAuditoria(
  repo: RegistroAuditoriaRepo,
  input: RegistrarAuditoriaInput,
): Promise<void> {
  await repo.create({
    data: {
      empresaId: input.empresaId,
      usuarioId: input.usuarioId,
      accion: input.accion,
      entidad: input.entidad,
      entidadId: input.entidadId,
      valoresAnteriores: input.valoresAnteriores,
      valoresNuevos: input.valoresNuevos,
      direccionIp: input.direccionIp ?? null,
    },
  });
}
