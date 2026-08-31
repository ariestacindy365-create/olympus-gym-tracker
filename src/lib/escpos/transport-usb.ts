// Sends raw ESC/POS bytes to a USB thermal printer via WebUSB — no OS print
// dialog, no OS-level printer driver involved at all.
//
// Deliberately does NOT filter the device picker to the standard USB
// "Printer" class (code 7) — most cheap ESC/POS thermal receipt printers
// are vendor-specific USB devices meant to be driven by a custom SDK, not
// standards-compliant USB-class printers an OS would recognize, so a class
// filter hides them from the picker entirely. Same reasoning applies to
// endpoint discovery: just grab the first OUT endpoint on any interface,
// rather than requiring an interface that declares itself class 7.
//
// Note: on Windows, opening the device can fail with "Access denied" if
// Windows has already bound its own driver to it (common — it auto-drives
// most USB devices on plug-in). The fix is a one-time driver swap to
// WinUSB via Zadig (https://zadig.akeo.ie) for that specific device; after
// that the printer no longer appears as a normal Windows printer, only as
// a WebUSB-accessible device.
async function findOutEndpoint(device: USBDevice): Promise<{ interfaceNumber: number; endpointNumber: number }> {
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }
  for (const iface of device.configuration?.interfaces ?? []) {
    for (const alternate of iface.alternates) {
      const endpoint = alternate.endpoints.find((e) => e.direction === "out");
      if (endpoint) return { interfaceNumber: iface.interfaceNumber, endpointNumber: endpoint.endpointNumber };
    }
  }
  throw new Error("Endpoint output tidak ditemukan pada perangkat USB ini — mungkin bukan printer.");
}

/** Reconnects to a USB printer the user already granted permission for, without any picker. */
export async function getRememberedUsbPrinter(): Promise<USBDevice | null> {
  if (!navigator.usb || typeof navigator.usb.getDevices !== "function") return null;
  const devices = await navigator.usb.getDevices();
  return devices[0] ?? null;
}

/** Shows the browser's one-time USB device picker, listing all connected USB devices. */
export async function requestUsbPrinter(): Promise<USBDevice> {
  if (!navigator.usb) {
    throw new Error("Browser ini tidak mendukung WebUSB. Gunakan Chrome atau Edge di komputer.");
  }
  return navigator.usb.requestDevice({ filters: [{}] });
}

export async function printViaUsb(device: USBDevice, data: Uint8Array): Promise<void> {
  await device.open();
  try {
    const { interfaceNumber, endpointNumber } = await findOutEndpoint(device);
    await device.claimInterface(interfaceNumber);
    await device.transferOut(endpointNumber, data);
  } finally {
    await device.close();
  }
}
