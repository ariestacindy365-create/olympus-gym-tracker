import { requireAnyRole } from "@/lib/auth";
import { NavBar } from "@/components/ui/NavBar";
import { BottomNav, type BottomNavItem } from "@/components/ui/BottomNav";
import { QuickSaleScanner } from "@/components/leads/QuickSaleScanner";

// Static sections under /leads; everything else there (/leads/[leadId]) is a
// lead detail page and should keep "Lead" highlighted.
const LEAD_SECTION_PATHS = [
  "account",
  "dashboard",
  "expenses",
  "finance",
  "history",
  "kasir",
  "owner",
  "packages",
  "payments",
  "pengumuman",
  "renewals",
  "sales",
].map((s) => `/leads/${s}`);

const ADMIN_LINKS = [
  { href: "/leads/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Lead", exclude: LEAD_SECTION_PATHS },
  { href: "/leads/renewals", label: "Perpanjangan" },
  { href: "/leads/payments", label: "Bayar" },
  { href: "/leads/expenses", label: "Biaya" },
  { href: "/leads/kasir", label: "Kasir" },
];

// Under "Lainnya ▾" on desktop, so the bar fits beside the name.
const STAFF_MORE = [
  { href: "/leads/history", label: "Riwayat" },
  { href: "/leads/pengumuman", label: "Info" },
  { href: "/leads/account", label: "Akun" },
];

const OWNER_LINKS = [
  { href: "/leads/owner", label: "Overview" },
  { href: "/leads", label: "Lead", exclude: LEAD_SECTION_PATHS },
  { href: "/leads/renewals", label: "Perpanjangan" },
  { href: "/leads/payments", label: "Bayar" },
  { href: "/leads/kasir", label: "Kasir" },
  { href: "/leads/packages", label: "Harga" },
];

// Phone: four tabs, the rest under "Lainnya".
const LEAD_TAB: BottomNavItem = { href: "/leads", label: "Lead", icon: "lead", exclude: LEAD_SECTION_PATHS };
const ADMIN_TABS: BottomNavItem[] = [
  { href: "/leads/dashboard", label: "Dashboard", icon: "home" },
  LEAD_TAB,
  { href: "/leads/payments", label: "Bayar", icon: "bayar" },
  { href: "/leads/kasir", label: "Kasir", icon: "kasir" },
];
const ADMIN_TABS_MORE: BottomNavItem[] = [
  { href: "/leads/renewals", label: "Perpanjangan" },
  { href: "/leads/expenses", label: "Biaya" },
  { href: "/leads/history", label: "Riwayat" },
  { href: "/leads/pengumuman", label: "Info" },
  { href: "/leads/account", label: "Akun" },
];
const OWNER_TABS: BottomNavItem[] = [
  { href: "/leads/owner", label: "Overview", icon: "home" },
  LEAD_TAB,
  { href: "/leads/payments", label: "Bayar", icon: "bayar" },
  { href: "/leads/packages", label: "Harga", icon: "harga" },
];
const OWNER_TABS_MORE: BottomNavItem[] = [
  { href: "/leads/renewals", label: "Perpanjangan" },
  { href: "/leads/kasir", label: "Kasir" },
  { href: "/leads/history", label: "Riwayat" },
  { href: "/leads/pengumuman", label: "Info" },
  { href: "/leads/account", label: "Akun" },
];

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyRole(["ADMIN", "OWNER"]);
  const links = user.role === "OWNER" ? OWNER_LINKS : ADMIN_LINKS;

  return (
    <div className="flex flex-1 flex-col">
      <NavBar links={links} more={STAFF_MORE} userName={user.name} role={user.role} mobileTabs={false} />
      {/* Bottom padding on phones keeps content clear of the tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:pb-6 print:max-w-none print:p-0">{children}</main>
      <BottomNav
        items={user.role === "OWNER" ? OWNER_TABS : ADMIN_TABS}
        more={user.role === "OWNER" ? OWNER_TABS_MORE : ADMIN_TABS_MORE}
        label={user.role === "OWNER" ? "Menu owner" : "Menu admin"}
      />
      {/* Only admins can record sales (POST /api/sales/scan is admin-only). */}
      {user.role === "ADMIN" && <QuickSaleScanner />}
    </div>
  );
}
