import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readMemberList } from "@/lib/fitquarter";
import { importFitQuarter, previewImport } from "@/lib/membership";
import { jakartaToday } from "@/lib/birthDate";
import { Role } from "@/generated/prisma/client";

const MAX_BYTES = 2 * 1024 * 1024;

// FitQuarter "Member List" CSV → members + current memberships.
// mode=preview counts what would happen; mode=import writes it.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const mode = form?.get("mode") === "import" ? "import" : "preview";
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Pilih file CSV Member List dari FitQuarter." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File terlalu besar (maks. 2 MB)." }, { status: 400 });
  }
  const parsed = readMemberList(await file.text(), jakartaToday());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = mode === "import" ? await importFitQuarter(parsed) : await previewImport(parsed);
  return NextResponse.json({ mode, result });
}
