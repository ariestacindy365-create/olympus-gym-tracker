"use client";

import { useSyncExternalStore, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getThermalPrinterMode,
  setThermalPrinterMode,
  subscribeThermalPrinterMode,
  connectThermalPrinter,
  isThermalPrinterSettingsDismissed,
  setThermalPrinterSettingsDismissed,
  type ThermalPrinterMode,
} from "@/lib/thermal-printer";

const SERVER_CAPABILITIES = { usb: false, bluetooth: false };
let capabilitiesSnapshot: { usb: boolean; bluetooth: boolean } | null = null;

function noopSubscribe() {
  return () => {};
}

// Static per-session — a cached module-level snapshot so repeated reads
// return the same object reference (useSyncExternalStore re-renders
// whenever the snapshot reference changes, so a fresh object literal every
// call would loop).
function getCapabilitiesSnapshot() {
  if (!capabilitiesSnapshot) {
    capabilitiesSnapshot = { usb: "usb" in navigator, bluetooth: "bluetooth" in navigator };
  }
  return capabilitiesSnapshot;
}

function getCapabilitiesServerSnapshot() {
  return SERVER_CAPABILITIES;
}

// A per-device preference (localStorage), not server-side — the printer
// (a POS58, shared with Pulih Gerak CRM) is physically wired to one
// specific computer or phone, so "connected" only ever means "connected on
// this browser". Renders nothing if this browser supports neither API
// (e.g. iOS Safari, which supports none of WebUSB/Web Bluetooth).
export function ThermalPrinterSettings() {
  const mode = useSyncExternalStore(subscribeThermalPrinterMode, getThermalPrinterMode, () => null);
  const dismissed = useSyncExternalStore(
    subscribeThermalPrinterMode,
    isThermalPrinterSettingsDismissed,
    () => false,
  );
  const { usb: supportsUsb, bluetooth: supportsBluetooth } = useSyncExternalStore(
    noopSubscribe,
    getCapabilitiesSnapshot,
    getCapabilitiesServerSnapshot,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConnect(target: ThermalPrinterMode) {
    setError(null);
    startTransition(async () => {
      try {
        await connectThermalPrinter(target);
        setThermalPrinterMode(target);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyambungkan printer");
      }
    });
  }

  function handleDisconnect() {
    setThermalPrinterMode(null);
  }

  if (!supportsUsb && !supportsBluetooth) return null;

  // Once connected, this doesn't need to take up space on a page admin
  // opens many times a day — collapse to one unobtrusive line, still with
  // a way to disconnect/switch printers if that's ever needed.
  if (mode) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>🖨️ Printer thermal tersambung ({mode === "usb" ? "USB" : "Bluetooth"})</span>
        <button type="button" onClick={handleDisconnect} className="underline">
          Lepas
        </button>
      </div>
    );
  }

  // Not connected, and this device has dismissed the prompt (e.g. it's
  // never going to sit next to the printer) — leave only a tiny link so
  // it's still reachable, without cluttering every visit to this page.
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setThermalPrinterSettingsDismissed(false)}
        className="text-xs text-muted underline"
      >
        Sambungkan Printer Thermal
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold">Printer Thermal (perangkat ini)</p>
        <button
          type="button"
          onClick={() => setThermalPrinterSettingsDismissed(true)}
          aria-label="Tutup"
          className="shrink-0 text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-xs text-muted">
          Belum tersambung — struk masih cetak lewat dialog print browser. Sambungkan sekali di
          perangkat ini untuk cetak langsung tanpa dialog. Printer ini juga dipakai Pulih Gerak
          CRM — masing-masing aplikasi perlu disambungkan sendiri-sendiri.
        </p>
        <div className="flex flex-wrap gap-2">
          {supportsUsb && (
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={isPending}
              onClick={() => handleConnect("usb")}
            >
              Sambungkan via USB
            </Button>
          )}
          {supportsBluetooth && (
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={isPending}
              onClick={() => handleConnect("bluetooth")}
            >
              Sambungkan via Bluetooth
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Card>
  );
}
