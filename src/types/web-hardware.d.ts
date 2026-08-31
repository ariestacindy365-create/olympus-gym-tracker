// Minimal ambient types for the WebUSB and Web Bluetooth APIs used by the
// thermal-printer feature (src/lib/escpos) — not present in TypeScript's
// default DOM lib. Deliberately narrow: only the members this codebase
// actually calls, not the full spec.

interface USBEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
}

interface USBAlternateInterface {
  interfaceClass: number;
  endpoints: USBEndpoint[];
}

interface USBInterface {
  interfaceNumber: number;
  alternates: USBAlternateInterface[];
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBDevice {
  configuration: USBConfiguration | null;
  productName?: string;
  vendorId: number;
  productId: number;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: Uint8Array): Promise<{ status: string; bytesWritten: number }>;
}

interface USBDeviceFilter {
  classCode?: number;
}

interface USB {
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValueWithoutResponse(value: Uint8Array): Promise<void>;
  writeValue(value: Uint8Array): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRequestDeviceFilter {
  services?: string[];
  namePrefix?: string;
}

interface Bluetooth {
  requestDevice(options: {
    acceptAllDevices?: boolean;
    filters?: BluetoothRequestDeviceFilter[];
    optionalServices?: string[];
  }): Promise<BluetoothDevice>;
  getDevices(): Promise<BluetoothDevice[]>;
}

interface Navigator {
  usb?: USB;
  bluetooth?: Bluetooth;
}
