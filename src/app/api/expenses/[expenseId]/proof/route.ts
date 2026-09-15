import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProofImage } from "@/lib/googleDrive";
import { Role } from "@/generated/prisma/client";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/expenses/[expenseId]/proof">) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.OWNER)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { expenseId } = await ctx.params;
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { proofImageFileId: true },
  });
  if (!expense?.proofImageFileId) {
    return NextResponse.json({ error: "Tidak ada bukti pengeluaran." }, { status: 404 });
  }

  try {
    const { buffer, mimeType } = await getProofImage(expense.proofImageFileId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengambil bukti pengeluaran." },
      { status: 500 }
    );
  }
}
