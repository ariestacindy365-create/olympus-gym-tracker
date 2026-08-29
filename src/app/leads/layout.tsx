import { requireAnyRole } from "@/lib/auth";
import { NavBar } from "@/components/ui/NavBar";

const ADMIN_LINKS = [
  { href: "/leads/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Semua Lead" },
  { href: "/leads/payments", label: "Pembayaran" },
  { href: "/leads/history", label: "Riwayat" },
  { href: "/leads/account", label: "Akun Saya" },
];

const OWNER_LINKS = [
  { href: "/leads/owner", label: "Overview" },
  { href: "/leads", label: "Semua Lead" },
  { href: "/leads/payments", label: "Pembayaran" },
  { href: "/leads/history", label: "Riwayat" },
  { href: "/leads/packages", label: "Daftar Harga" },
  { href: "/leads/account", label: "Akun Saya" },
];

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyRole(["ADMIN", "OWNER"]);
  const links = user.role === "OWNER" ? OWNER_LINKS : ADMIN_LINKS;

  return (
    <div className="flex flex-1 flex-col">
      <NavBar links={links} userName={user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
