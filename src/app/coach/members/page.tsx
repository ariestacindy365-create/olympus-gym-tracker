import { prisma } from "@/lib/prisma";
import { isOnline } from "@/lib/status";
import { todayDateKey } from "@/lib/workout";
import { MemberManager } from "@/components/coach/MemberManager";
import { Role } from "@/generated/prisma/client";

export default async function CoachMembersPage() {
  const [members, todaysSets] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.MEMBER },
      orderBy: { name: "asc" },
    }),
    prisma.setEntry.findMany({
      where: { workoutDate: todayDateKey() },
      select: { memberId: true },
    }),
  ]);

  const loggedMemberIds = new Set(todaysSets.map((t) => t.memberId));

  const memberData = members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    online: isOnline(member.lastActiveAt),
    loggedToday: loggedMemberIds.has(member.id),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Members</h1>
      <MemberManager members={memberData} />
    </div>
  );
}
