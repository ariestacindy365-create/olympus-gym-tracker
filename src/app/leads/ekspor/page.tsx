import { requireAnyRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportForm } from "@/components/leads/ExportForm";
import { jakartaToday } from "@/lib/birthDate";

// Admin/owner: download member, finance, lead and booking data as Excel.
export default async function ExportPage() {
  await requireAnyRole(["ADMIN", "OWNER"]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Data" title="Ekspor data" subtitle="Unduh data Olympus jadi satu file Excel, satu tab per jenis data." />
      <ExportForm today={jakartaToday()} />
    </div>
  );
}
