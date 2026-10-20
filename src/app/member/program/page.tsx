import { getCurrentUser } from "@/lib/auth";
import { getThisWeekProgram } from "@/lib/weekProgram";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgramWeekView } from "@/components/member/ProgramWeekView";

export default async function MemberProgramPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { weekNumber, days } = await getThisWeekProgram();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={`Minggu ${weekNumber}`}
        title="Program Minggu Ini"
        subtitle="Program kelas dari pelatih. Jangan lupa catat bebannya!"
      />
      <ProgramWeekView weekNumber={weekNumber} days={days} />
    </div>
  );
}
