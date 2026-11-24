import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";
import { elevenLabsEnabled, speakText } from "@/lib/elevenlabs";

// The PR announcement read by ElevenLabs, for the coach's slideshow:
// POST { text } → audio/mpeg. 404 when no ElevenLabs key is set (the TV
// then uses the browser voice). Recent ones are kept so a replay is free.
const cache = new Map<string, ArrayBuffer>();
const CACHE_MAX = 30;
const MAX_CHARS = 600;
// Only the slideshow's own announcement, so the ElevenLabs quota isn't spent on other text.
const ANNOUNCEMENT = /^Perhatian, perhatian! (Selamat untuk|Rekor baru untuk) /;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.COACH) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  if (!elevenLabsEnabled()) return NextResponse.json({ error: "Suara ElevenLabs belum diatur." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS || !ANNOUNCEMENT.test(text)) return NextResponse.json({ error: "Teks tidak valid." }, { status: 400 });

  let audio = cache.get(text);
  if (!audio) {
    const made = await speakText(text);
    if (!made) return NextResponse.json({ error: "Suara belum bisa dibuat." }, { status: 502 });
    audio = made;
    cache.set(text, audio);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  }
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" } });
}
