import "server-only";
import { prisma } from "@/lib/prisma";

/** Register only the selected library movement in the smaller logging dictionary. */
export async function resolvePersonalExercise(id: string) {
  if (!id.startsWith("movement:")) return prisma.exercise.findUnique({ where: { id } });
  const movement = await prisma.movement.findUnique({ where: { id: id.slice("movement:".length) }, select: { name: true } });
  if (!movement) return null;
  return prisma.exercise.upsert({ where: { name: movement.name }, create: { name: movement.name }, update: {} });
}
