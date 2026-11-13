import { requireRole } from "@/lib/auth";
import { NavBar } from "@/components/ui/NavBar";
import { BottomNav, type BottomNavItem } from "@/components/ui/BottomNav";

const LINKS = [
  { href: "/coach/dashboard", label: "Dashboard" },
  { href: "/coach/members", label: "Members" },
  { href: "/coach/pt", label: "PT" },
  { href: "/coach/programs", label: "Program" },
  { href: "/coach/feed", label: "Feed" },
];

// Under "Lainnya ▾" on desktop, so the bar fits beside the coach's name.
const MORE = [
  { href: "/coach/latihan", label: "Latihan Saya" },
  { href: "/coach/pengumuman", label: "Info" },
  { href: "/coach/timer", label: "Timer" },
  { href: "/coach/import", label: "Import" },
];

// Phone: four tabs, the rest under "Lainnya".
const TABS: BottomNavItem[] = [
  { href: "/coach/dashboard", label: "Dashboard", icon: "home" },
  { href: "/coach/members", label: "Members", icon: "members" },
  { href: "/coach/programs", label: "Program", icon: "program" },
  { href: "/coach/pt", label: "PT", icon: "pt" },
];
const TABS_MORE: BottomNavItem[] = [
  { href: "/coach/feed", label: "Feed" },
  { href: "/coach/latihan", label: "Latihan Saya" },
  { href: "/coach/jadwal", label: "Jadwal kelas" },
  { href: "/coach/timer", label: "Timer" },
  { href: "/coach/pengumuman", label: "Info" },
  { href: "/coach/import", label: "Import" },
];

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COACH");

  return (
    <div className="flex flex-1 flex-col">
      <NavBar links={LINKS} more={MORE} userName={user.name} role={user.role} mobileTabs={false} />
      {/* Bottom padding on phones keeps content clear of the tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:pb-6">{children}</main>
      <BottomNav items={TABS} more={TABS_MORE} label="Menu coach" />
    </div>
  );
}
