import { ImportProgressForm } from "@/components/coach/ImportProgressForm";

export default function CoachImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Import Progress</h1>
        <p className="text-sm text-muted">
          Upload file Excel (.xlsx) berisi sheet &ldquo;Progress&rdquo; dengan kolom: Tanggal, Nama Member, Nama
          Gerakan, Beban (kg), Repetisi, dan Catatan (opsional). Member harus sudah terdaftar di halaman Members
          sebelum diimport.
        </p>
      </div>
      <ImportProgressForm />
    </div>
  );
}
