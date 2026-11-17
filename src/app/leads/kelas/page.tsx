import Link from "next/link";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckInDesk } from "@/components/leads/CheckInDesk";
import { ClassRoster, type RosterEntry } from "@/components/leads/ClassRoster";
import { QuotaSetting } from "@/components/leads/QuotaSetting";
import { classesOn, getBookingSettings } from "@/lib/booking";
import { addDays, sessionById, weekdayOf } from "@/lib/bookingRules";
import { creditsLeft } from "@/lib/fitquarter";
import { jakartaToday } from "@/lib/birthDate";

const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Front desk: check-in, each class's participants, and (owner) places per class.
export default async function ClassDeskPage(props: PageProps<"/leads/kelas">) {
  const user = await requireAnyRole(["ADMIN", "OWNER"]);
  const sp = await props.searchParams;
  const today = jakartaToday();
  const day = typeof sp.tgl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tgl) ? sp.tgl : today;
  const settings = await getBookingSettings();
  const classes = await classesOn(day);
  const picked = typeof sp.kelas === "string" && sessionById(sp.kelas) ? sp.kelas : null;
  const rows = picked
    ? await prisma.classBooking.findMany({
        where: { classDate: new Date(`${day}T00:00:00Z`), sessionId: picked, status: { not: "CANCELLED" } },
        include: { user: { select: { name: true } }, membership: { select: { packageName: true, credits: true, creditsUsed: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const roster: RosterEntry[] = rows.map((r) => ({
    id: r.id,
    name: r.user.name,
    status: r.status,
    membership: r.membership ? `${r.membership.packageName.replace(/^[^:]+:\s*/, "")} · ${creditsLeft(r.membership) == null ? "Unlimited" : `sisa ${creditsLeft(r.membership)}x`}` : r.status === "WAITLIST" ? "Menunggu tempat" : "Tanpa membership",
    byAdmin: !!r.addedById,
  }));
  const href = (d: string, k?: string | null) => `/leads/kelas?tgl=${d}${k ? `&kelas=${k}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Booking kelas" title="Kelas & check-in" subtitle="Scan kartu member saat datang. Hadir / Tidak hadir memakai kredit; Hapus mengembalikan kredit." />
      {day === today && <CheckInDesk />}

      <div className="flex items-center justify-between gap-2">
        <Link href={href(addDays(day, -1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-lg" aria-label="Hari sebelumnya">
          ‹
        </Link>
        <div className="text-center">
          <p className="font-display text-lg font-bold">{label(day)}</p>
          {day !== today && (
            <Link href={href(today)} className="text-xs font-semibold text-accent">
              Kembali ke hari ini
            </Link>
          )}
        </div>
        <Link href={href(addDays(day, 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-lg" aria-label="Hari berikutnya">
          ›
        </Link>
      </div>

      {weekdayOf(day) === 0 ? (
        <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-sm text-muted">Minggu tidak ada kelas.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {classes.map((c) => (
            <li key={c.sessionId}>
              <Link
                href={href(day, c.sessionId === picked ? null : c.sessionId)}
                scroll={false}
                aria-current={c.sessionId === picked ? "true" : undefined}
                className={`flex flex-col rounded-xl border p-3 ${c.sessionId === picked ? "border-accent bg-accent/5" : "border-border bg-surface"}`}
              >
                <span className="font-display text-lg font-bold leading-tight">{c.name}</span>
                <span className="truncate text-xs text-muted">{c.coach ?? "—"}</span>
                <span className="mt-1 text-sm font-semibold">
                  {c.booked}/{settings.quota}
                  {c.waitlist > 0 && <span className="font-normal text-muted"> · {c.waitlist} tunggu</span>}
                </span>
                <span className="text-xs text-success">{c.attended} hadir</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {picked && <ClassRoster key={`${day}-${picked}`} day={day} sessionId={picked} title={`${sessionById(picked)!.name} · ${classes.find((c) => c.sessionId === picked)?.coach ?? ""}`} entries={roster} quota={settings.quota} />}

      {user.role === "OWNER" && <QuotaSetting initial={settings.quota} />}
    </div>
  );
}
