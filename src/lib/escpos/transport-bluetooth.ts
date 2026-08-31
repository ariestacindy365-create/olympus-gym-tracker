// Sends raw ESC/POS bytes to a Bluetooth thermal printer via Web
// Bluetooth — no OS print dialog. Web Bluetooth only reaches Bluetooth
// Low Energy (BLE) devices; it CANNOT connect to a printer that only
// speaks classic Bluetooth SPP (serial port profile) — that's a browser
// platform limitation, not something fixable in this code. Cheap 58mm
// printers like the WP58D/RPP02N/POS58 family commonly expose one of a
// few well-known "serial-over-BLE" GATT services; we try each until one
// works, since the printer doesn't advertise which one it uses ahead of
// connecting.
const KNOWN_SERIAL_SERVICES: { service: string; write: string }[] = [
  {
    // ISSC/Microchip "Transparent UART" — the most common service on
    // RPP02N/POS58-style boards and many other generic Chinese BLE printers.
    service: "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    write: "49535343-8841-43f4-a8d4-ecbe34729bb3",
  },
  {
    // HM-10/HM-11 style serial-over-BLE module.
    service: "0000ffe0-0000-1000-8000-00805f9b34fb",
    write: "0000ffe1-0000-1000-8000-00805f9b34fb",
  },
  {
    // Seen on several other generic ESC/POS BLE printer boards.
    service: "000018f0-0000-1000-8000-00805f9b34fb",
    write: "00002af1-0000-1000-8000-00805f9b34fb",
  },
];

const OPTIONAL_SERVICES = KNOWN_SERIAL_SERVICES.map((s) => s.service);

// Conservative default BLE write size — most modules accept ~20-180 bytes
// per write depending on negotiated MTU; 100 is a safe default that works
// without needing to negotiate/detect the actual MTU.
const BLE_CHUNK_SIZE = 100;
const BLE_CHUNK_DELAY_MS = 20;

function chunk(data: Uint8Array, size: number): Uint8Array[] {
  const parts: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += size) {
    parts.push(data.slice(i, i + size));
  }
  return parts;
}

/**
 * Reconnects to a Bluetooth printer the user already granted permission
 * for, without any picker — when the browser supports it. getDevices() is
 * NOT part of the stable Web Bluetooth spec (it's an experimental
 * "persistent permissions" extension some Chrome builds omit or gate
 * behind a flag), so this must degrade to "no remembered device" rather
 * than throw when it's missing — printBytesThermal then falls back to
 * showing the picker via requestBluetoothPrinter() every time instead.
 */
export async function getRememberedBluetoothPrinter(): Promise<BluetoothDevice | null> {
  if (!navigator.bluetooth || typeof navigator.bluetooth.getDevices !== "function") return null;
  const devices = await navigator.bluetooth.getDevices();
  return devices[0] ?? null;
}

/** Shows the browser's one-time Bluetooth device picker. */
export async function requestBluetoothPrinter(): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) {
    throw new Error("Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome di Android atau desktop.");
  }
  return navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: OPTIONAL_SERVICES,
  });
}

export async function printViaBluetooth(device: BluetoothDevice, data: Uint8Array): Promise<void> {
  if (!device.gatt) throw new Error("Perangkat ini tidak mendukung koneksi GATT");

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();

  try {
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    for (const candidate of KNOWN_SERIAL_SERVICES) {
      try {
        const service = await server.getPrimaryService(candidate.service);
        characteristic = await service.getCharacteristic(candidate.write);
        break;
      } catch {
        // This printer doesn't expose this particular service — try the next.
      }
    }

    if (!characteristic) {
      throw new Error(
        "Tidak menemukan layanan cetak yang dikenali di printer ini. Printer mungkin memakai Bluetooth Classic (bukan BLE), yang tidak didukung browser — coba sambungkan lewat USB sebagai gantinya.",
      );
    }

    for (const part of chunk(data, BLE_CHUNK_SIZE)) {
      await characteristic.writeValueWithoutResponse(part);
      await new Promise((resolve) => setTimeout(resolve, BLE_CHUNK_DELAY_MS));
    }
  } finally {
    // Always release the connection after printing — this printer is
    // shared with another app (Pulih Gerak CRM), and a BLE peripheral
    // typically only accepts one active connection at a time, so holding
    // the link open after we're done would lock the other app out.
    server.disconnect();
  }
}
