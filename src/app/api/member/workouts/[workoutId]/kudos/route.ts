import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSeeWorkout } from "@/lib/feed";
import { notifyUsers } from "@/lib/notify";

// 💪 on a feed workout: POST adds, DELETE removes.
async function handle(method: "POST" | "DELETE", workoutId: string) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || !canSeeWorkout(workout, user)) {
    return NextResponse.json({ error: "Latihan tidak ditemukan." }, { status: 404 });
  }
  if (method === "POST") {
    const existed = await prisma.workoutKudo.findUnique({ where: { workoutId_memberId: { workoutId, memberId: user.id } } });
    if (!existed && workout.memberId !== user.id) {
      const title = `💪 ${user.name} memberi semangat`;
      const url = `/member/feed#post-${workoutId}`;
      after(async () => {
        // Tapping 💪 off and on again shouldn't notify twice.
        const recent = await prisma.notification.findFirst({
          where: { userId: workout.memberId, type: "KUDOS", title, url, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
          select: { id: true },
        });
        if (!recent) await notifyUsers([workout.memberId], { type: "KUDOS", title, body: `di latihanmu "${workout.title}"`, url });
      });
    }
    await prisma.workoutKudo.upsert({
      where: { workoutId_memberId: { workoutId, memberId: user.id } },
      create: { workoutId, memberId: user.id },
      update: {},
    });
  } else {
    await prisma.workoutKudo.deleteMany({ where: { workoutId, memberId: user.id } });
  }
  const count = await prisma.workoutKudo.count({ where: { workoutId } });
  return NextResponse.json({ count, mine: method === "POST" });
}

export async function POST(_req: Request, ctx: RouteContext<"/api/member/workouts/[workoutId]/kudos">) {
  return handle("POST", (await ctx.params).workoutId);
}
export async function DELETE(_req: Request, ctx: RouteContext<"/api/member/workouts/[workoutId]/kudos">) {
  return handle("DELETE", (await ctx.params).workoutId);
}
