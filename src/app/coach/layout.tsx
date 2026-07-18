import { requireRole } from "@/lib/auth";
import { NavBar } from "@/components/ui/NavBar";

const LINKS = [
  { href: "/coach/dashboard", label: "Dashboard" },
  { href: "/coach/members", label: "Members" },
  { href: "/coach/exercises", label: "Gerakan" },
  { href: "/coach/board", label: "Live Board" },
  { href: "/coach/import", label: "Import" },
];

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COACH");

  return (
    <div className="flex flex-1 flex-col">
      <NavBar links={LINKS} userName={user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
