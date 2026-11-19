import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildExport } from "@/lib/dataExport";
import { exportFileName, parseExportRequest } from "@/lib/exportRules";
import { Role } from "@/generated/prisma/client";

// Admin/owner: download data as one Excel file.
// ?bagian=member,keuangan,lead&dari=YYYY-MM-DD&sampai=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const req = parseExportRequest(sp.get("bagian"), sp.get("dari"), sp.get("sampai"));
  if ("error" in req) return NextResponse.json({ error: req.error }, { status: 400 });
  const file = await buildExport(req.sections, req.from, req.to);
  console.info(`Data export by ${user.role} ${user.id}: ${req.sections.join(",")} ${req.from}..${req.to}`);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(req.from, req.to)}"`,
      "Cache-Control": "no-store",
    },
  });
}
