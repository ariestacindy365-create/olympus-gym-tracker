import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/validation";
import { dateKeyFromString } from "@/lib/workout";
import { uploadProofImage } from "@/lib/googleDrive";
import { Role } from "@/generated/prisma/client";

// Business expenses — recorded by ADMIN day-to-day, same as Payment; OWNER
// sees the aggregated reporting on the dashboard instead.
export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  let proofImageFileId: string | undefined;
  if (parsed.data.proofImage) {
    const folderId = process.env.GOOGLE_DRIVE_EXPENSES_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ error: "GOOGLE_DRIVE_EXPENSES_FOLDER_ID belum diatur." }, { status: 500 });
    }
    try {
      proofImageFileId = await uploadProofImage({
        dataUrl: parsed.data.proofImage,
        filename: `expense-${Date.now()}.jpg`,
        folderId,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Gagal mengunggah bukti pengeluaran." },
        { status: 500 }
      );
    }
  }

  const expense = await prisma.expense.create({
    data: {
      category: parsed.data.category,
      amount: parsed.data.amount,
      paidAt: parsed.data.paidAt ? dateKeyFromString(parsed.data.paidAt) : new Date(),
      description: parsed.data.description,
      proofImageFileId,
      createdById: admin.id,
    },
  });

  return NextResponse.json({ expense });
}
