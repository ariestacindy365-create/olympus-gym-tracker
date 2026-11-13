import { BottomNav, type BottomNavItem } from "@/components/ui/BottomNav";

const ITEMS: BottomNavItem[] = [
  { href: "/member/dashboard", label: "Latihan", icon: "latihan" },
  { href: "/member/feed", label: "Feed", icon: "feed" },
  { href: "/member/body", label: "Body", icon: "body" },
  { href: "/member/achievements", label: "Emblem", icon: "emblem" },
];

// Pages that had no way in from the tab bar before.
const MORE: BottomNavItem[] = [
  { href: "/member/program", label: "Program minggu ini" },
  { href: "/member/leaderboard", label: "Peringkat" },
  { href: "/member/notifikasi", label: "Notifikasi" },
  { href: "/member/account", label: "Akun" },
];

// Phone-first navigation for members: a thumb-reachable tab bar instead of
// the scrolling tab strip under the header (desktop keeps the header links).
export function MemberBottomNav() {
  return <BottomNav items={ITEMS} more={MORE} label="Menu member" />;
}
