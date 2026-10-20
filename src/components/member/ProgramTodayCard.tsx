"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgramSlide, useAppQrCode } from "@/components/shared/ProgramSlide";
import type { WeekProgramDay } from "@/lib/weekProgram";

/** Today's class slide on the member dashboard, linking to the full week. */
export function ProgramTodayCard({ day }: { day: WeekProgramDay }) {
  const qr = useAppQrCode();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">📋 Program Hari Ini</h2>
        <Link href="/member/program" className="text-xs font-semibold text-accent hover:underline">
          Program minggu ini →
        </Link>
      </div>
      <Link href="/member/program" className="overflow-hidden rounded-lg border border-border">
        <ProgramSlide data={day} qrDataUrl={qr} />
      </Link>
    </Card>
  );
}
