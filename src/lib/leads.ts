import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/workout";
import type { LeadStatus } from "@/generated/prisma/client";

// 2+ replies from the prospect to the admin's DM = a "qualified" lead.
export const QUALIFY_THRESHOLD = 2;

export function isQualified(replyCount: number): boolean {
  return replyCount >= QUALIFY_THRESHOLD;
}

// Only ever moves status *forward* — logging a reply on a lead that's
// already in TRIAL/CONVERTED/LOST shouldn't bump it back down to QUALIFIED.
export function statusAfterReply(current: LeadStatus, replyCount: number): LeadStatus {
  if (current === "TRIAL" || current === "CONVERTED" || current === "LOST") return current;
  if (isQualified(replyCount)) return "QUALIFIED";
  return "CONTACTED";
}

// H+1 / H+3 due dates measured from the trial's end date, normalized to
// local midnight so "due today" is a plain equality check against
// todayDateKey() (same convention DailyWorkout.workoutDate uses).
export function followUpDueDates(trialEndDate: Date): { h1: Date; h3: Date } {
  const base = new Date(trialEndDate.getFullYear(), trialEndDate.getMonth(), trialEndDate.getDate());
  return { h1: addDays(base, 1), h3: addDays(base, 3) };
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

// Creates the two follow-ups for a trial that ended without same-day
// conversion. Called once, right after the trial outcome is recorded.
export async function scheduleTrialFollowUps(params: { leadId: string; trialId: string; endDate: Date }) {
  const { leadId, trialId, endDate } = params;
  const { h1, h3 } = followUpDueDates(endDate);
  await prisma.followUp.createMany({
    data: [
      { leadId, trialId, type: "H1", dueDate: h1 },
      { leadId, trialId, type: "H3", dueDate: h3 },
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
    include: { lead: true, trial: true },
    orderBy: { dueDate: "asc" },
  });
}
