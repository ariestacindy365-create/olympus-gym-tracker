import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL atau GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY belum diatur.");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

// Uploads a compressed photo (client sends a "data:image/...;base64,..."
// string) into the shared folder, returning the Drive file ID to store on
// the Payment row. The folder must already be shared with the service
// account (Editor access) — see the setup notes given to the owner.
export async function uploadProofImage(params: { dataUrl: string; filename: string }): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID belum diatur.");
  }

  const match = params.dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Format gambar tidak valid.");
  }
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: params.filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });

  if (!res.data.id) {
    throw new Error("Upload ke Google Drive gagal.");
  }
  return res.data.id;
}

export async function getProofImage(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = getDriveClient();
  const [meta, media] = await Promise.all([
    drive.files.get({ fileId, fields: "mimeType" }),
    drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" }),
  ]);
  return {
    buffer: Buffer.from(media.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? "image/jpeg",
  };
}
