import { getCurrentUser } from "@/lib/auth";
import { getThisWeekProgram } from "@/lib/weekProgram";
import { getMemberTodayClass } from "@/lib/memberClass";
import { classLabel } from "@/lib/classSchedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgramWeekView } from "@/components/member/ProgramWeekView";

export default async function MemberProgramPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { current } = await getMemberTodayClass(user.id);
  const { weekNumber, coachName, days } = await getThisWeekProgram(current?.coach?.id ?? null);
  const borrowed = current?.coach && coachName && coachName !== current.coach.name;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={`Minggu ${weekNumber}${current ? ` · Kelas ${classLabel(current)}` : ""}`}
        title="Program Minggu Ini"
        subtitle={
          borrowed
            ? `${current!.coach!.name} belum mengisi program minggu ini, jadi yang tampil program ${coachName}.`
            : `Program kelas dari ${coachName ?? "pelatih"}. Jangan lupa catat bebannya!`
        }
      />
      <ProgramWeekView weekNumber={weekNumber} days={days} />
    </div>
  );
}
