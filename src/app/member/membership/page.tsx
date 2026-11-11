import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CancelOrderButton, MembershipShop } from "@/components/member/MembershipShop";
import { creditsLeft, formatMembershipDate, getMembershipSummary } from "@/lib/membership";
import { formatRupiah } from "@/lib/packages";

export default async function MemberMembershipPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [summary, orders, packages, info] = await Promise.all([
    getMembershipSummary(user.id),
    prisma.membershipOrder.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.package.findMany({
      where: { isActive: true, showInApp: true, durationDays: { not: null } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, price: true, durationDays: true, credits: true },
    }),
    prisma.gymPaymentInfo.findUnique({ where: { id: 1 } }),
  ]);
  const pending = orders.find((o) => o.status === "PENDING") ?? null;
  const latest = orders[0] ?? null;
  const { current, upcoming, lastEnded } = summary;
  const left = current ? creditsLeft(current) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Member Saya</h1>
        <p className="text-sm text-muted">Masa aktif, sisa sesi, dan beli / perpanjang paket.</p>
      </div>

      <Card className="flex flex-col gap-2">
        {current ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{current.packageName}</h2>
              <Badge tone="success">Aktif</Badge>
            </div>
            <p className="text-sm">
              Berlaku sampai <span className="font-semibold">{formatMembershipDate(current.expiresAt)}</span>
            </p>
            <p className="text-sm">
              {left == null ? (
                "Kelas unlimited"
              ) : (
                <>
                  Sisa <span className="font-semibold">{left}</span> dari {current.credits} sesi kelas
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Belum ada member aktif</h2>
              <Badge tone="muted">Tidak aktif</Badge>
            </div>
            {lastEnded && <p className="text-sm text-muted">Paket terakhir ({lastEnded.packageName}) berakhir {formatMembershipDate(lastEnded.expiresAt)}.</p>}
          </>
        )}
        {upcoming.map((m) => (
          <p key={m.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
            Berikutnya: <span className="font-semibold">{m.packageName}</span>, mulai {formatMembershipDate(m.startsAt)} s/d {formatMembershipDate(m.expiresAt)}
          </p>
        ))}
      </Card>

      {pending && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/40">
          <div>
            <p className="font-semibold">⏳ Menunggu konfirmasi admin</p>
            <p className="text-sm text-muted">
              {pending.packageName} · {formatRupiah(pending.price)} · dikirim {formatMembershipDate(pending.createdAt)}
            </p>
          </div>
          <CancelOrderButton orderId={pending.id} />
        </Card>
      )}
      {!pending && latest?.status === "REJECTED" && (
        <Card className="border-danger/40">
          <p className="font-semibold text-danger">Pembelian {latest.packageName} ditolak</p>
          <p className="text-sm">{latest.rejectReason}</p>
          <p className="mt-1 text-xs text-muted">Kirim ulang bukti yang benar di bawah, atau hubungi admin.</p>
        </Card>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{current || upcoming.length ? "Perpanjang / tambah paket" : "Beli paket"}</h2>
        {(current || upcoming.length > 0) && <p className="text-xs text-muted">Paket baru mulai setelah paket yang sekarang habis, jadi tidak ada hari yang hilang.</p>}
        <MembershipShop
          packages={packages.map((p) => ({ ...p, durationDays: p.durationDays! }))}
          info={{ bankName: info?.bankName ?? "", accountNumber: info?.accountNumber ?? "", accountName: info?.accountName ?? "", qrisImage: info?.qrisImage ?? null }}
          lastWa={latest?.waNumber ?? ""}
          blocked={!!pending}
        />
      </section>
    </div>
  );
}
