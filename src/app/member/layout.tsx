import { requireRole } from "@/lib/auth";
import { NavBar } from "@/components/ui/NavBar";

const LINKS = [
  { href: "/member/dashboard", label: "Dashboard" },
  { href: "/member/account", label: "Akun" },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("MEMBER");

  return (
    <div className="flex flex-1 flex-col">
      <NavBar links={LINKS} userName={user.name} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
