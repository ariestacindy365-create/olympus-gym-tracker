"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Outcome = "CONVERTED" | "STILL_FOLLOWING" | "LOST" | "FOLLOWED_UP";

// Decided by the lead's *current* status, not the follow-up's type — a
// CUSTOM (manually scheduled) follow-up can land at any stage, and even
// H7/H21 should fall back to conversion outcomes if the lead somehow isn't
// MEMBER/RETENSI yet. Once already a member, there's nothing to convert;
// completing just records that the admin followed up.
export function FollowUpActions({ followUpId, leadStatus }: { followUpId: string; leadStatus: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function complete(outcome: Outcome) {
    setPending(outcome);
    setError(null);
    try {
      const res = await fetch(`/api/followups/${followUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan.");
        return;
      }
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(null);
    }
  }

  const isPostConversion = leadStatus === "MEMBER" || leadStatus === "RETENSI";

  return (
    <div className="mt-2 flex flex-col gap-2">
      <Input
        placeholder="Catatan hasil follow up (opsional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {isPostConversion ? (
          <>
            <Button
              variant="primary"
              className="px-3 py-1.5 text-xs"
              disabled={pending !== null}
              onClick={() => complete("FOLLOWED_UP")}
            >
              {pending === "FOLLOWED_UP" ? "..." : "Sudah Follow Up"}
            </Button>
            <Button
              variant="danger"
              className="px-3 py-1.5 text-xs"
              disabled={pending !== null}
              onClick={() => complete("LOST")}
            >
              {pending === "LOST" ? "..." : "Tidak Perpanjang"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              className="px-3 py-1.5 text-xs"
              disabled={pending !== null}
              onClick={() => complete("CONVERTED")}
            >
              {pending === "CONVERTED" ? "..." : "Konversi Member"}
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={pending !== null}
              onClick={() => complete("STILL_FOLLOWING")}
            >
              {pending === "STILL_FOLLOWING" ? "..." : "Masih Follow Up"}
            </Button>
            <Button
              variant="danger"
              className="px-3 py-1.5 text-xs"
              disabled={pending !== null}
              onClick={() => complete("LOST")}
            >
              {pending === "LOST" ? "..." : "Tidak Lanjut"}
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
