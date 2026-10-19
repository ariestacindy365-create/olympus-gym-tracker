import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, StoryCharacter } from "@/generated/prisma/client";

const FROM_CLIENT: Record<string, StoryCharacter> = {
  pria: StoryCharacter.PRIA,
  wanita: StoryCharacter.WANITA,
  hijab: StoryCharacter.HIJAB,
};

// Saves which lifter (cowok / cewek / cewek berhijab) the member wants on
// their story cards, so it follows them to any device.
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MEMBER) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const character = FROM_CLIENT[String(body?.character)];
  if (!character) {
    return NextResponse.json({ error: "Pilihan karakter tidak valid." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { storyCharacter: character } });
  return NextResponse.json({ ok: true });
}
