// Web Push without a library: VAPID auth (RFC 8292) and aes128gcm payload
// encryption (RFC 8291) on node:crypto. The VAPID key pair is made on first
// use and kept in PushConfig, so no env vars are needed.
import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign,
  type JsonWebKey,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

const b64url = (buf: Buffer) => buf.toString("base64url");
const fromB64url = (s: string) => Buffer.from(s, "base64url");

interface VapidKeys {
  /** Uncompressed P-256 public key (65 bytes), base64url — what browsers take as applicationServerKey. */
  publicKey: string;
  privateJwk: JsonWebKey;
}

let cached: VapidKeys | null = null;

export async function getVapidKeys(): Promise<VapidKeys> {
  if (cached) return cached;
  let row = await prisma.pushConfig.findUnique({ where: { id: "singleton" } });
  if (!row) {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = privateKey.export({ format: "jwk" });
    const publicKey = b64url(Buffer.concat([Buffer.from([4]), fromB64url(jwk.x!), fromB64url(jwk.y!)]));
    // Two first requests at once: the second insert loses and reads the winner.
    await prisma.pushConfig.createMany({ data: [{ publicKey, privateJwk: jwk as object }], skipDuplicates: true });
    row = await prisma.pushConfig.findUniqueOrThrow({ where: { id: "singleton" } });
  }
  cached = { publicKey: row.publicKey, privateJwk: row.privateJwk as JsonWebKey };
  return cached;
}

function vapidHeader(endpoint: string, keys: VapidKeys): string {
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    Buffer.from(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: "mailto:admin@olympus.gym",
      })
    )
  );
  const key = createPrivateKey({ key: keys.privateJwk, format: "jwk" });
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${keys.publicKey}`;
}

/** RFC 8291 aes128gcm body for one subscription. Exported for the round-trip test. */
export function encryptPayload(payload: Buffer, p256dh: string, auth: string, salt = randomBytes(16)) {
  const uaPublic = fromB64url(p256dh);
  const authSecret = fromB64url(auth);
  const ecdh = createECDH("prime256v1");
  const asPublic = ecdh.generateKeys();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  // Single record: payload then the 0x02 "last record" delimiter.
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, encrypted]);
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one push. Returns "gone" when the subscription has expired and should be deleted. */
export async function sendPush(target: PushTarget, data: unknown): Promise<"ok" | "gone" | "error"> {
  try {
    const keys = await getVapidKeys();
    const body = encryptPayload(Buffer.from(JSON.stringify(data)), target.p256dh, target.auth);
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidHeader(target.endpoint, keys),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(24 * 3600),
        Urgency: "normal",
      },
      body: new Uint8Array(body),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
