import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSeeWorkout } from "@/lib/feed";
import { Role } from "@/generated/prisma/client";

const commentSchema = z.object({ body: z.string().trim().min(1, { error: "Tulis komentarnya dulu." }).max(300) });

async function load(workoutId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not authorized." }, { status: 401 }) };
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || !canSeeWorkout(workout, user)) {
    return { error: NextResponse.json({ error: "Latihan tidak ditemukan." }, { status: 404 }) };
  }
  return { user, workout };
}

export async function GET(_req: Request, ctx: RouteContext<"/api/member/workouts/[workoutId]/comments">) {
  const { workoutId } = await ctx.params;
  const r = await load(workoutId);
  if ("error" in r) return r.error;
  const comments = await prisma.workoutComment.findMany({
    where: { workoutId },
    orderBy: { createdAt: "asc" },
    include: { member: { select: { name: true, role: true } } },
  });
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      name: c.member.name,
      coach: c.member.role === Role.COACH,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/member/workouts/[workoutId]/comments">) {
  const { workoutId } = await ctx.params;
  const r = await load(workoutId);
  if ("error" in r) return r.error;
  const parsed = commentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Komentar tidak valid." }, { status: 400 });
  }
  const c = await prisma.workoutComment.create({ data: { workoutId, memberId: r.user.id, body: parsed.data.body } });
  return NextResponse.json({
    comment: { id: c.id, body: c.body, name: r.user.name, coach: r.user.role === Role.COACH, createdAt: c.createdAt.toISOString() },
  });
}
