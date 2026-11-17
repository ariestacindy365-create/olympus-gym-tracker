import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { FitQuarterImport } from "@/components/leads/FitQuarterImport";
import { jakartaToday } from "@/lib/birthDate";

// Admin/owner: bring FitQuarter's members and current memberships into the app.
export default async function ImportFitQuarterPage() {
  await requireAnyRole(["ADMIN", "OWNER"]);
  const today = new Date(`${jakartaToday()}T00:00:00Z`);
  const [members, linked, current, lastImport] = await Promise.all([
    prisma.importedMember.count(),
    prisma.importedMember.count({ where: { userId: { not: null } } }),
    prisma.membership.count({ where: { expiresAt: { gte: today } } }),
    prisma.importedMember.aggregate({ _max: { updatedAt: true } }),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Membership"
        title="Impor dari FitQuarter"
        subtitle="Unggah file Member List dari FitQuarter. Member yang daftar atau login dengan email yang sama otomatis mendapat membershipnya."
      />
      <div className="grid grid-cols-3 gap-2">
        {[
          [members, "Member FitQuarter"],
          [linked, "Sudah punya akun"],
          [current, "Membership berlaku"],
        ].map(([v, l]) => (
          <div key={String(l)} className="rounded-xl bg-surface-2 px-2 py-3 text-center">
            <p className="font-display text-2xl font-bold">{v}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </div>
      {lastImport._max.updatedAt && (
        <p className="-mt-2 text-xs text-muted">
          Terakhir diimpor{" "}
          {lastImport._max.updatedAt.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
        </p>
      )}
      <FitQuarterImport />
    </div>
  );
}
