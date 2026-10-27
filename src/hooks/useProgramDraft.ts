"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";

interface Draft<T, R> { value: T; version: R; baseline: T }
export function useProgramDraft<T, R>(key: string, initial: T, initialVersion: R, validate?: (value: unknown) => boolean) {
  const [state, setState] = useState<Draft<T, R>>(() => ({ value: initial, version: initialVersion, baseline: initial }));
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Memuat draft…");
  const cleared = useRef(false);
  const validator = useRef(validate);
  const unreadable = useRef(false);
  const dirty = JSON.stringify(state.value) !== JSON.stringify(state.baseline);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw) as Draft<T, R>;
          if (!draft || !("value" in draft) || !("version" in draft) || !("baseline" in draft)) throw new Error("Invalid draft");
          if (validator.current && (!validator.current(draft.value) || !validator.current(draft.baseline))) throw new Error("Invalid draft content");
          setState(draft); setStatus("Draft lokal dipulihkan. Versi server diperiksa saat menyimpan.");
        } else setStatus("Belum ada perubahan.");
      } catch { unreadable.current = true; setStatus("Penyimpanan draft tidak tersedia atau tidak bisa dibaca. Jangan tutup halaman; unduh draft sebagai cadangan."); }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);
  useEffect(() => {
    if (!ready || cleared.current || unreadable.current) return;
    try {
      if (dirty) localStorage.setItem(key, JSON.stringify(state));
      else localStorage.removeItem(key);
      // Avoid a setState effect; the storage-status notification is asynchronous.
      const timer = setTimeout(() => setStatus(dirty ? "Draft tersimpan di perangkat ini. Belum disimpan ke server." : "Program sesuai versi tersimpan."), 0);
      return () => clearTimeout(timer);
    } catch {
      const timer = setTimeout(() => setStatus("Draft belum tersimpan: penyimpanan penuh/ditolak. Jangan tutup halaman; unduh draft."), 0);
      return () => clearTimeout(timer);
    }
  }, [state, ready, dirty, key]);
  useEffect(() => {
    function guard(event: BeforeUnloadEvent) {
      if (dirty && !cleared.current) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  return {
    ...state, dirty, ready, status,
    setValue(value: SetStateAction<T>) {
      cleared.current = false;
      setState((current) => ({ ...current, value: typeof value === "function" ? (value as (old: T) => T)(current.value) : value }));
    },
    acknowledge(value: T, version: R, baseline = value) {
      const next = { value, version, baseline };
      // The editor can unmount immediately after save; persist acknowledgement now.
      try {
        if (JSON.stringify(value) === JSON.stringify(baseline)) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(next));
      } catch { setStatus("Program tersimpan di server, tetapi draft lokal belum dapat diperbarui."); }
      setState(next);
    },
    download() {
      const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "olympus-draft-program.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    clear() {
      cleared.current = true;
      try { localStorage.removeItem(key); } catch { /* The caller also shows a confirmation before discarding. */ }
    },
  };
}
