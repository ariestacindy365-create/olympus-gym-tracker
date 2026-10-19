import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, StoryCharacter, StorySkinTone } from "@/generated/prisma/client";

const FROM_CLIENT: Record<string, StoryCharacter> = {
  pria: StoryCharacter.PRIA,
  wanita: StoryCharacter.WANITA,
  hijab: StoryCharacter.HIJAB,
};

const SKIN_FROM_CLIENT: Record<string, StorySkinTone> = {
  terang: StorySkinTone.TERANG,
  langsat: StorySkinTone.LANGSAT,
  sawo: StorySkinTone.SAWO,
  gelap: StorySkinTone.GELAP,
};

// Saves which lifter (cowok / cewek / cewek berhijab) and skin tone the
// member wants on their story cards, so it follows them to any device.
// Either field may be sent on its own.
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const character = body?.character !== undefined ? FROM_CLIENT[String(body.character)] : undefined;
  const skinTone = body?.skinTone !== undefined ? SKIN_FROM_CLIENT[String(body.skinTone)] : undefined;
  if ((body?.character !== undefined && !character) || (body?.skinTone !== undefined && !skinTone) || (!character && !skinTone)) {
    return NextResponse.json({ error: "Pilihan karakter tidak valid." }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { ...(character && { storyCharacter: character }), ...(skinTone && { storySkinTone: skinTone }) },
  });
  return NextResponse.json({ ok: true });
}
