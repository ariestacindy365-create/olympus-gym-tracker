import { prisma } from "@/lib/prisma";
import { CLASS_SESSIONS } from "@/lib/classSessions";
import { CLASS_WEEKDAYS, getClassSchedule } from "@/lib/classSchedule";
import { ClassScheduleEditor } from "@/components/coach/ClassScheduleEditor";
import { Role } from "@/generated/prisma/client";

export default async function ClassSchedulePage() {
  const [schedule, coaches] = await Promise.all([
    getClassSchedule(),
    prisma.user.findMany({ where: { role: Role.COACH }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const initial: Record<string, string | null> = {};
  for (const e of schedule) initial[`${e.weekday}|${e.sessionId}`] = e.coach?.id ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Jadwal Kelas</h1>
        <p className="text-sm text-muted">
          Siapa yang mengajar di tiap jam. Member otomatis melihat program coach dari kelas yang sedang atau akan berjalan
          hari itu, dan bisa ganti kelas sendiri di Latihan Hari Ini. Perubahan langsung tersimpan.
        </p>
      </div>
      <ClassScheduleEditor
        weekdays={CLASS_WEEKDAYS}
        sessions={CLASS_SESSIONS.map((s) => ({ id: s.id, name: s.name }))}
        coaches={coaches}
        initial={initial}
      />
    </div>
  );
}
