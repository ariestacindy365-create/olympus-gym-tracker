import { getRememberedUsbPrinter, requestUsbPrinter, printViaUsb } from "@/lib/escpos/transport-usb";
import {
  getRememberedBluetoothPrinter,
  requestBluetoothPrinter,
  printViaBluetooth,
} from "@/lib/escpos/transport-bluetooth";

export type ThermalPrinterMode = "usb" | "bluetooth";

const STORAGE_KEY = "thermal-printer-mode";

type Listener = () => void;
const listeners = new Set<Listener>();

// Which transport (if any) this specific browser/device should use for
// direct thermal printing — a per-device preference, not a server-side
// setting, since the printer is physically wired to one particular
// computer or phone (and shared with Pulih Gerak CRM on the same POS58
// printer). Not set = fall back to normal browser print dialog.
//
// Exposed as a tiny external store (subscribe/get) rather than a plain
// getter so ThermalPrinterSettings can read it via useSyncExternalStore —
// the SSR-safe way to read a browser-only value without a hydration
// mismatch or a setState-in-effect lint violation.
export function subscribeThermalPrinterMode(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThermalPrinterMode(): ThermalPrinterMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "usb" || v === "bluetooth" ? v : null;
  } catch {
    return null;
  }
}

export function setThermalPrinterMode(mode: ThermalPrinterMode | null): void {
  if (typeof window === "undefined") return;
  try {
    if (mode) window.localStorage.setItem(STORAGE_KEY, mode);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, etc.) — mode just won't
    // persist across reloads, not fatal.
  }
  for (const listener of listeners) listener();
}

const DISMISSED_KEY = "thermal-printer-settings-dismissed";

// Whether this device has dismissed the "not connected yet" prompt — for
// devices that will never physically sit next to the printer, so the
// prompt doesn't clutter every visit to the payment page. Independent of
// `mode`: dismissing doesn't disconnect anything, it just hides the
// not-connected card until re-opened from the small link left in its place.
export function isThermalPrinterSettingsDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setThermalPrinterSettingsDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) window.localStorage.setItem(DISMISSED_KEY, "1");
    else window.localStorage.removeItem(DISMISSED_KEY);
  } catch {
    // not fatal — just won't persist across reloads
  }
  for (const listener of listeners) listener();
}

/**
 * Sends already-built ESC/POS bytes straight to the thermal printer —
 * reusing a previously-granted device silently when possible, otherwise
 * showing the browser's unavoidable one-time device picker. No OS print
 * dialog at any point. Throws with a message safe to show the user as-is.
 */
export async function printBytesThermal(bytes: Uint8Array, mode: ThermalPrinterMode): Promise<void> {
  if (mode === "usb") {
    const device = (await getRememberedUsbPrinter()) ?? (await requestUsbPrinter());
    await printViaUsb(device, bytes);
  } else {
    const device = (await getRememberedBluetoothPrinter()) ?? (await requestBluetoothPrinter());
    await printViaBluetooth(device, bytes);
  }
}

/** Just the connect step, for a "Sambungkan Printer" settings action. */
export async function connectThermalPrinter(mode: ThermalPrinterMode): Promise<void> {
  if (mode === "usb") {
    await requestUsbPrinter();
  } else {
    await requestBluetoothPrinter();
  }
}
