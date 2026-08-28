"use client";

import { Button } from "@/components/ui/Button";

export function PrintReceiptButton() {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      Cetak Struk
    </Button>
  );
}
