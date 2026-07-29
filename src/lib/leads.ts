import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";

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
      lead: { deletedAt: null, ...(adminId ? { capturedById: adminId } : {}) },
    },
    include: { lead: true },
    orderBy: { dueDate: "asc" },
  });
}

// Full follow-up history for the "Riwayat" page: what's been done, what's
// overdue/due now, and what's scheduled for later — scoped to one admin's
// own captures, or every lead when adminId is omitted (OWNER view). Deleted
// leads are excluded here (they get their own section, see getDeletedLeads).
export async function getFollowUpHistory(adminId?: string) {
  const today = todayDateKey();
  const leadFilter = { deletedAt: null, ...(adminId ? { capturedById: adminId } : {}) };

  const [done, dueNow, upcoming] = await Promise.all([
    prisma.followUp.findMany({
      where: { status: "DONE", lead: leadFilter },
      include: { lead: true, completedBy: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.followUp.findMany({
      where: { status: "PENDING", dueDate: { lte: today }, lead: leadFilter },
      include: { lead: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.followUp.findMany({
      where: { status: "PENDING", dueDate: { gt: today }, lead: leadFilter },
      include: { lead: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return { done, dueNow, upcoming };
}

// Leads an admin has soft-deleted — surfaced in Riwayat as an audit trail
// instead of vanishing silently (there's no confirmation prompt on delete).
export async function getDeletedLeads(adminId?: string) {
  return prisma.lead.findMany({
    where: { deletedAt: { not: null }, ...(adminId ? { capturedById: adminId } : {}) },
    include: { deletedBy: { select: { name: true } }, capturedBy: { select: { name: true } } },
    orderBy: { deletedAt: "desc" },
  });
}
