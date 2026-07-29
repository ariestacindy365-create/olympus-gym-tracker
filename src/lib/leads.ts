import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";

// 2+ replies from the prospect to the admin's DM shows a "qualified" badge.
// This is just a display signal — it doesn't drive status transitions.
export const QUALIFY_THRESHOLD = 2;

export function isQualified(replyCount: number): boolean {
  return replyCount >= QUALIFY_THRESHOLD;
}

// H+1 / H+3 due dates measured from when the lead was marked TRIAL,
// normalized to local midnight so "due today" is a plain equality check
// against todayDateKey() (same convention DailyWorkout.workoutDate uses).
export function followUpDueDates(trialMarkedAt: Date): { h1: Date; h3: Date } {
  const base = new Date(trialMarkedAt.getFullYear(), trialMarkedAt.getMonth(), trialMarkedAt.getDate());
  return { h1: addDays(base, 1), h3: addDays(base, 3) };
}

// Creates the two follow-ups for a lead just marked TRIAL. Called once,
// right when the status transition happens.
export async function scheduleTrialFollowUps(params: { leadId: string; trialMarkedAt: Date }) {
  const { leadId, trialMarkedAt } = params;
  const { h1, h3 } = followUpDueDates(trialMarkedAt);
  await prisma.followUp.createMany({
    data: [
      { leadId, type: "H1", dueDate: h1 },
      { leadId, type: "H3", dueDate: h3 },
    ],
  });
}

export async function getTodayDueFollowUps(adminId?: string) {
  const today = todayDateKey();
  return prisma.followUp.findMany({
    where: {
      status: "PENDING",
      dueDate: { lte: today },
      ...(adminId ? { lead: { capturedById: adminId } } : {}),
    },
    include: { lead: true },
    orderBy: { dueDate: "asc" },
  });
}

// Full follow-up history for the "Riwayat" page: what's been done, what's
// overdue/due now, and what's scheduled for later — scoped to one admin's
// own captures, or every lead when adminId is omitted (OWNER view).
export async function getFollowUpHistory(adminId?: string) {
  const today = todayDateKey();
  const leadFilter = adminId ? { lead: { capturedById: adminId } } : {};

  const [done, dueNow, upcoming] = await Promise.all([
    prisma.followUp.findMany({
      where: { status: "DONE", ...leadFilter },
      include: { lead: true, completedBy: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.followUp.findMany({
      where: { status: "PENDING", dueDate: { lte: today }, ...leadFilter },
      include: { lead: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.followUp.findMany({
      where: { status: "PENDING", dueDate: { gt: today }, ...leadFilter },
      include: { lead: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return { done, dueNow, upcoming };
}
