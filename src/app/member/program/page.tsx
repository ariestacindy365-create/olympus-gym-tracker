import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getThisWeekCoaches, getThisWeekProgram } from "@/lib/weekProgram";
import { getMemberTodayClass } from "@/lib/memberClass";
import { classLabel } from "@/lib/classSchedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgramWeekView } from "@/components/member/ProgramWeekView";

export default async function MemberProgramPage(props: PageProps<"/member/program">) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { current } = await getMemberTodayClass(user.id);
  const myCoachId = current?.coach?.id ?? null;
  // ?coach=<id>: another coach's program this week; default is the member's class.
  const sp = await props.searchParams;
  const picked = typeof sp.coach === "string" ? sp.coach : null;
  const first = await getThisWeekProgram(myCoachId);
  const coaches = await getThisWeekCoaches(first.weekNumber);
  const pickedCoach = picked && picked !== myCoachId ? coaches.find((c) => c.id === picked) : undefined;
  const { weekNumber, coachName, days } = pickedCoach ? await getThisWeekProgram(pickedCoach.id) : first;
  const borrowed = !pickedCoach && current?.coach && coachName && coachName !== current.coach.name;
  // Tab of the program on screen: the picked coach, else whose program the class shows.
  const shownId = pickedCoach?.id ?? coaches.find((c) => c.name === coachName)?.id ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={`Minggu ${weekNumber}${current && !pickedCoach ? ` · Kelas ${classLabel(current)}` : ""}`}
        title="Program Minggu Ini"
        subtitle={
          pickedCoach
            ? `Program ${pickedCoach.name}.`
            : borrowed
              ? `${current!.coach!.name} belum mengisi program minggu ini, jadi yang tampil program ${coachName}.`
              : `Program kelas dari ${coachName ?? "pelatih"}. Jangan lupa catat bebannya!`
        }
      />
      {coaches.length > 1 && (
        <nav aria-label="Program coach" className="-mt-1 grid grid-cols-2 gap-2 sm:flex">
          {coaches.map((c) => {
            const active = c.id === shownId;
            return (
              <Link
                key={c.id}
                href={c.id === myCoachId ? "/member/program" : `/member/program?coach=${c.id}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col rounded-xl border px-3 py-2 transition sm:min-w-44 ${
                  active ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent"
                }`}
              >
                <span className="truncate text-sm font-bold">
                  {c.name}
                  {c.id === myCoachId && <span className={`ml-1 text-[11px] font-semibold ${active ? "text-white/80" : "text-accent"}`}>· kelasmu</span>}
                </span>
                <span className={`truncate text-[11.5px] ${active ? "text-white/80" : "text-muted"}`}>
                  {c.times.length > 0 ? `Hari ini ${c.times.join(" · ")}` : "Tidak mengajar hari ini"}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
      <ProgramWeekView key={shownId ?? "class"} weekNumber={weekNumber} days={days} />
    </div>
  );
}
