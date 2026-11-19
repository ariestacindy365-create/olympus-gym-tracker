import QRCode from "qrcode";
import { TrialNotice } from "@/components/member/TrialNotice";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookingBoard, type BoardClass, type BoardDay } from "@/components/member/BookingBoard";
import { CheckInCard } from "@/components/member/CheckInCard";
import { MembershipChip, chipMembership } from "@/components/member/MembershipList";
import { classesOn, ensureMemberCode, getBookingSettings } from "@/lib/booking";
import { BOOKING_OPEN, bookableDays, canCancelAt, classStart, pickMembership, sessionById } from "@/lib/bookingRules";
import { claimImportedMember, membershipViews } from "@/lib/membership";
import { jakartaToday } from "@/lib/birthDate";

const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { ...opts, timeZone: "UTC" });

// Book bootcamp classes up to a week ahead, and the card to scan at the desk.
export default async function MemberBookingPage(props: PageProps<"/member/booking">) {
  const user = await getCurrentUser();
  if (!user) return null;
  await claimImportedMember(user);
  if (!BOOKING_OPEN) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader eyebrow="Kelas bootcamp" title="Booking kelas" />
        <p className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-card">Booking kelas lewat aplikasi segera dibuka. Untuk sekarang, booking seperti biasa lewat admin Olympus ya.</p>
      </div>
    );
  }
  const sp = await props.searchParams;
  const today = jakartaToday();
  const settings = await getBookingSettings();
  const days = bookableDays(today, settings.daysAhead);
  const selected = typeof sp.tgl === "string" && days.includes(sp.tgl) ? sp.tgl : days[0];
  const [classes, mine, memberships, code] = await Promise.all([
    selected ? classesOn(selected) : Promise.resolve([]),
    prisma.classBooking.findMany({
      where: { userId: user.id, classDate: { gte: new Date(`${today}T00:00:00Z`) }, status: { not: "CANCELLED" } },
      orderBy: [{ classDate: "asc" }, { sessionId: "asc" }],
    }),
    membershipViews(user.id, new Date(`${today}T00:00:00Z`)),
    ensureMemberCode(user.id),
  ]);
  const qr = await QRCode.toDataURL(code, { margin: 1, width: 360, errorCorrectionLevel: "M" });
  const now = new Date();
  const waitingAhead = async (b: (typeof mine)[number]) =>
    prisma.classBooking.count({ where: { classDate: b.classDate, sessionId: b.sessionId, status: "WAITLIST", createdAt: { lt: b.createdAt } } });

  const boardDays: BoardDay[] = days.map((d) => ({
    day: d,
    weekday: d === today ? "Hari ini" : dayLabel(d, { weekday: "short" }),
    date: dayLabel(d, { day: "numeric", month: "short" }),
    booked: mine.some((b) => b.classDate.toISOString().slice(0, 10) === d && b.status !== "WAITLIST"),
  }));
  const boardClasses: BoardClass[] = await Promise.all(
    classes.map(async (c) => {
      const s = sessionById(c.sessionId)!;
      const b = mine.find((x) => x.classDate.toISOString().slice(0, 10) === selected && x.sessionId === c.sessionId) ?? null;
      const start = classStart(selected!, s);
      return {
        ...c,
        quota: settings.quota,
        started: now >= start,
        mine: b
          ? { id: b.id, status: b.status, canCancel: b.status === "WAITLIST" || canCancelAt(now, start, settings.cancelHours), position: b.status === "WAITLIST" ? (await waitingAhead(b)) + 1 : null }
          : null,
      };
    })
  );
  const canBook = selected ? !!pickMembership(memberships, selected) : false;
  const todays = mine.filter((b) => b.classDate.toISOString().slice(0, 10) === today && (b.status === "BOOKED" || b.status === "ATTENDED" || b.status === "WAITLIST"));
  const chip = chipMembership(memberships, today);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kelas bootcamp" title="Booking kelas" subtitle={`Booking sampai ${settings.daysAhead} hari ke depan. Batal paling lambat ${settings.cancelHours} jam sebelum kelas, kreditnya kembali.`} />
      <TrialNotice what="Booking kelas lewat aplikasi" />
      <MembershipChip item={chip} today={today} />
      {todays.length > 0 && (
        <CheckInCard
          code={code}
          qr={qr}
          classes={todays.map((b) => `${sessionById(b.sessionId)?.name ?? ""}${b.status === "ATTENDED" ? " · ✓ hadir" : b.status === "WAITLIST" ? " · daftar tunggu" : ""}`)}
        />
      )}
      {selected ? (
        <BookingBoard days={boardDays} selected={selected} classes={boardClasses} canBook={canBook} cancelHours={settings.cancelHours} />
      ) : (
        <p className="text-sm text-muted">Belum ada jadwal kelas.</p>
      )}
      {todays.length === 0 && <CheckInCard code={code} qr={qr} classes={[]} />}
    </div>
  );
}
