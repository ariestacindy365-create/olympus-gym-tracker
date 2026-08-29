import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildDailyReportMessage } from "@/lib/dailyReport";
import { sendTelegramMessage } from "@/lib/telegram";
import { Role } from "@/generated/prisma/client";

// Two ways in: Vercel Cron calling with the shared CRON_SECRET (see
// vercel.json), or the OWNER triggering it manually (e.g. a "Kirim
// Sekarang" button) while logged in.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.OWNER) {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
  }

  try {
    const message = await buildDailyReportMessage();
    await sendTelegramMessage(message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mengirim laporan." }, { status: 500 });
  }
}
