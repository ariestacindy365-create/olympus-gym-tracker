"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { compressImageFile } from "@/lib/imageCompression";

export function ProofImageUpload({
  value,
  onChange,
  label = "Bukti (opsional)",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      onChange(dataUrl);
    } catch {
      setError("Gagal memproses foto. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={() => cameraInputRef.current?.click()}
        >
          📷 Ambil Foto
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={() => galleryInputRef.current?.click()}
        >
          🖼️ Pilih dari Galeri
        </Button>
        {pending && <span className="text-xs text-muted">Memproses foto...</span>}
        {value && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview bukti" className="h-12 w-12 rounded-md border border-border object-cover" />
            <button type="button" className="text-xs text-danger underline" onClick={() => onChange(null)}>
              Hapus
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
