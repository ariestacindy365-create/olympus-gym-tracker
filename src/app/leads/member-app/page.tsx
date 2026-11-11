import Link from "next/link";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddMembershipForm, MemberOrderActions } from "@/components/leads/MemberOrderActions";
import { creditsLeft, formatMembershipDate } from "@/lib/membership";
import { formatRupiah, packageDetail, PAYMENT_METHOD_LABEL } from "@/lib/packages";
import { toWhatsAppLink } from "@/lib/whatsapp";

const STATUS: Record<string, { label: string; tone: "success" | "danger" | "muted" }> = {
  APPROVED: { label: "Dikonfirmasi", tone: "success" },
  REJECTED: { label: "Ditolak", tone: "danger" },
  CANCELLED: { label: "Dibatalkan member", tone: "muted" },
};

export default async function MemberAppPage() {
  await requireAnyRole(["ADMIN", "OWNER"]);
  const now = new Date();
  const [pending, recent, members, packages, active] = await Promise.all([
    prisma.membershipOrder.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true, _count: { select: { memberships: true, leadAccounts: true } } } } },
    }),
    prisma.membershipOrder.findMany({
      // Picks that never got a proof aren't purchases.
      where: { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] }, waNumber: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } }, reviewedBy: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { role: "MEMBER" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.package.findMany({ where: { isActive: true, durationDays: { not: null } }, orderBy: { sortOrder: "asc" } }),
    prisma.membership.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { expiresAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Member App</h1>
        <p className="text-sm text-muted">Konfirmasi pembelian member dari aplikasi, dan aktifkan member yang bayar di meja depan.</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">Menunggu verifikasi ({pending.length})</h2>
        <p className="text-sm text-muted">Cek mutasi rekening / QRIS: cari nominal persis (3 angka terakhir = kode unik) dan nama pengirimnya.</p>
        {pending.length === 0 && <p className="text-sm text-muted">Tidak ada pembelian yang menunggu.</p>}
        {pending.map((o) => (
          <Card key={o.id} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <a href={`/api/membership-orders/${o.id}/proof`} target="_blank" rel="noreferrer" className="shrink-0" title="Buka bukti">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/membership-orders/${o.id}/proof`} alt={`Bukti bayar ${o.user.name}`} className="h-40 w-full rounded-lg border border-border object-cover sm:w-32" />
            </a>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{o.user.name}</p>
                {o.user._count.memberships === 0 && o.user._count.leadAccounts === 0 && <Badge tone="accent">Calon member baru</Badge>}
              </div>
              <p className="font-display text-2xl font-bold tabular-nums">
                {formatRupiah(o.price + o.uniqueCode).slice(0, -3)}
                <span className="rounded bg-amber-300 px-1 text-slate-900">{formatRupiah(o.price + o.uniqueCode).slice(-3)}</span>
              </p>
              <p className="text-sm">
                {o.packageName} · {o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] : ""}
                {o.senderName && (
                  <>
                    {" "}
                    · pengirim <span className="font-semibold">{o.senderName}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-muted">
                {packageDetail(o)} · {o.user.email} · dikirim {formatMembershipDate(o.createdAt)}
                {o.waNumber && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={toWhatsAppLink(o.waNumber)} target="_blank" rel="noreferrer" className="text-accent underline">
                      WA {o.waNumber}
                    </a>
                  </>
                )}
              </p>
              <div className="mt-2">
                <MemberOrderActions orderId={o.id} amount={formatRupiah(o.price + o.uniqueCode)} senderName={o.senderName} />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">Aktifkan member (bayar di meja depan)</h2>
        <Card>
          <AddMembershipForm members={members} packages={packages.map((p) => ({ id: p.id, label: `${p.name} · ${packageDetail(p)}` }))} />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">Member aktif di aplikasi ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">Belum ada.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {active.map((m) => {
              const left = creditsLeft(m);
              return (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">{m.user.name}</span> <span className="text-muted">· {m.packageName}</span>
                  </span>
                  <span className="text-muted">
                    {m.startsAt > now ? `mulai ${formatMembershipDate(m.startsAt)} · ` : ""}s/d {formatMembershipDate(m.expiresAt)}
                    {left != null && ` · sisa ${left} sesi`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold">Riwayat pembelian</h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-semibold">{o.user.name}</span> · {o.packageName} · {formatRupiah(o.price + o.uniqueCode)}
                  <span className="block text-xs text-muted">
                    {formatMembershipDate(o.createdAt)}
                    {o.reviewedBy && ` · ${o.status === "APPROVED" ? "diverifikasi" : "ditolak"} oleh ${o.reviewedBy.name}`}
                    {o.rejectReason && ` · ${o.rejectReason}`}
                  </span>
                  {o.status === "APPROVED" && o.waNumber && (
                    <a
                      href={toWhatsAppLink(
                        o.waNumber,
                        `Halo ${o.user.name}, pembayaran ${o.packageName} di Olympus sudah kami verifikasi. Member kamu sudah aktif, bisa dicek di aplikasi Olympus menu Member. Terima kasih!`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent underline"
                    >
                      Kabari lewat WA
                    </a>
                  )}
                </span>
                <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted">
        Pembelian yang dikonfirmasi otomatis tercatat di <Link href="/leads/payments" className="underline">Bayar</Link> (bisa cetak struk) dan masuk pengingat
        perpanjangan.
      </p>
    </div>
  );
}
