import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { classesOn } from "@/lib/booking";
import { BOOKING_STATUS_LABEL, addDays, weekdayOf } from "@/lib/bookingRules";
import { jakartaToday } from "@/lib/birthDate";

const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Coaches see who's booked into each class (the front desk manages it).
export default async function CoachClassesPage(props: PageProps<"/coach/kelas">) {
  const coach = await getCurrentUser();
  if (!coach) return null;
  const sp = await props.searchParams;
  const today = jakartaToday();
  const day = typeof sp.tgl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tgl) ? sp.tgl : today;
  const classes = await classesOn(day);
  const rows = await prisma.classBooking.findMany({
    where: { classDate: new Date(`${day}T00:00:00Z`), status: { not: "CANCELLED" } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const firstName = coach.name.replace(/^coach\s+/i, "").split(" ")[0].toLowerCase();
  const mineFirst = [...classes].sort((a, b) => Number(!(a.coach ?? "").toLowerCase().includes(firstName)) - Number(!(b.coach ?? "").toLowerCase().includes(firstName)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Booking kelas" title="Peserta kelas" subtitle="Siapa saja yang booking. Check-in dan perubahan dilakukan admin di meja depan." />
      <div className="flex items-center justify-between gap-2">
        <Link href={`/coach/kelas?tgl=${addDays(day, -1)}`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-lg" aria-label="Hari sebelumnya">
          ‹
        </Link>
        <p className="font-display text-lg font-bold">{label(day)}</p>
        <Link href={`/coach/kelas?tgl=${addDays(day, 1)}`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-lg" aria-label="Hari berikutnya">
          ›
        </Link>
      </div>
      {weekdayOf(day) === 0 && <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-sm text-muted">Minggu tidak ada kelas.</p>}
      {mineFirst.map((c) => {
        const people = rows.filter((r) => r.sessionId === c.sessionId);
        const mine = (c.coach ?? "").toLowerCase().includes(firstName);
        return (
          <section key={c.sessionId} className={`rounded-2xl border bg-surface p-4 shadow-card ${mine ? "border-accent" : "border-border"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">
                {c.name} <span className="text-sm font-normal text-muted">· {c.coach ?? "—"}</span>
              </h2>
              <span className="text-sm text-muted">
                {c.booked} booking · {c.attended} hadir
              </span>
            </div>
            {people.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Belum ada yang booking.</p>
            ) : (
              <ol className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {people.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm last:border-0">
                    <span className="truncate">
                      {i + 1}. {p.user.name}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${p.status === "ATTENDED" ? "text-success" : p.status === "WAITLIST" ? "text-[#b45309]" : p.status === "NO_SHOW" ? "text-danger" : "text-muted"}`}>
                      {BOOKING_STATUS_LABEL[p.status]}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
