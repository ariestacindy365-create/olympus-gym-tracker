// One-time setup helper: run this locally once (`npx tsx --env-file=.env
// scripts/google-drive-setup.ts`) after creating an OAuth Client ID
// ("Desktop app" type) in Google Cloud Console.
//
// It opens a Google login/consent page in your browser, catches the
// redirect on a local port, exchanges it for a refresh token, creates a
// "Bukti Pembayaran Olympus" folder in your Drive, and prints the three
// values to put in .env / Vercel:
//   GOOGLE_OAUTH_REFRESH_TOKEN
//   GOOGLE_DRIVE_FOLDER_ID
// (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET must already be in
// .env before running this — that's how this script authenticates.)

import http from "node:http";
import { exec } from "node:child_process";
import { google } from "googleapis";

const PORT = 53214;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Isi dulu GOOGLE_OAUTH_CLIENT_ID dan GOOGLE_OAUTH_CLIENT_SECRET di .env sebelum menjalankan ini.");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log("\nBuka URL ini (atau browser akan terbuka otomatis), lalu login & klik Allow:\n");
  console.log(authUrl + "\n");
  openBrowser(authUrl);

  const code = await waitForAuthCode();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      "\nTidak dapat refresh_token. Kemungkinan akun ini sudah pernah kasih izin sebelumnya — cabut dulu aksesnya di myaccount.google.com/permissions lalu coba lagi."
    );
    process.exit(1);
  }
  oauth2Client.setCredentials(tokens);

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const folder = await drive.files.create({
    requestBody: { name: "Bukti Pembayaran Olympus", mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });

  console.log("\nBerhasil! Tambahkan ini ke .env (dan ke Environment Variables Vercel):\n");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_DRIVE_FOLDER_ID=${folder.data.id}\n`);
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "", REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (error) {
        res.end("<h1>Gagal.</h1><p>Bisa ditutup, coba lagi dari terminal.</p>");
        server.close();
        reject(new Error(error));
        return;
      }
      res.end("<h1>Berhasil!</h1><p>Bisa ditutup, kembali ke terminal.</p>");
      server.close();
      if (code) resolve(code);
      else reject(new Error("Tidak ada kode otorisasi di callback."));
    });
    server.listen(PORT);
  });
}

function openBrowser(url: string) {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
