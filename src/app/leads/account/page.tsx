import { requireAnyRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ChangeEmailForm } from "@/components/member/ChangeEmailForm";
import { ChangePinForm } from "@/components/member/ChangePinForm";
import { AdminInviteCodeCard } from "@/components/leads/AdminInviteCodeCard";
import { Role } from "@/generated/prisma/client";

export default async function LeadsAccountPage() {
  const user = await requireAnyRole(["ADMIN", "OWNER"]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Akun Saya</h1>
        <p className="text-sm text-muted">{user.name}</p>
      </div>

      {user.role === Role.OWNER && process.env.ADMIN_INVITE_CODE && (
        <AdminInviteCodeCard code={process.env.ADMIN_INVITE_CODE} />
      )}

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Ubah Email</h2>
        <p className="mb-4 text-xs text-muted">Email ini dipakai untuk login. Pastikan email masih aktif.</p>
        <ChangeEmailForm currentEmail={user.email} endpoint="/api/account/email" />
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Ubah PIN</h2>
        <p className="mb-4 text-xs text-muted">PIN 4 digit ini dipakai untuk login.</p>
        <ChangePinForm endpoint="/api/account/pin" />
      </Card>
    </div>
  );
}
