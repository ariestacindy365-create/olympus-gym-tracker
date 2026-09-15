import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";

// Authenticates as the owner's own Google account via a long-lived OAuth
// refresh token, obtained once through scripts/google-drive-setup.ts —
// not a service-account key, since Google now blocks key creation by
// default on most new accounts/projects.
function getDriveClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, atau GOOGLE_OAUTH_REFRESH_TOKEN belum diatur."
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth });
}

// Uploads a compressed photo (client sends a "data:image/...;base64,..."
// string) into the given Drive folder, returning the Drive file ID to
// store on the row (Payment or Expense). Callers pass which subfolder —
// GOOGLE_DRIVE_PAYMENTS_FOLDER_ID or GOOGLE_DRIVE_EXPENSES_FOLDER_ID —
// both live inside the "Olympus Lifting Club" parent folder created by
// scripts/google-drive-setup.ts, in the same Drive the OAuth token
// authenticates as.
export async function uploadProofImage(params: { dataUrl: string; filename: string; folderId: string }): Promise<string> {
  const { folderId } = params;

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
