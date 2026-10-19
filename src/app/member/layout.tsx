import { requireRole } from "@/lib/auth";
import { NavBar } from "@/components/ui/NavBar";
import { MemberBottomNav } from "@/components/member/MemberBottomNav";

const LINKS = [
  { href: "/member/dashboard", label: "Dashboard" },
  { href: "/member/body", label: "Body Metrics" },
  { href: "/member/leaderboard", label: "Peringkat" },
  { href: "/member/achievements", label: "Achievement" },
  { href: "/member/account", label: "Akun" },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("MEMBER");

  return (
    <div className="flex flex-1 flex-col">
      <NavBar links={LINKS} userName={user.name} role={user.role} mobileTabs={false} />
      {/* Bottom padding on phones keeps content clear of the tab bar. */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6 sm:pb-6">{children}</main>
      <MemberBottomNav />
    </div>
  );
}
