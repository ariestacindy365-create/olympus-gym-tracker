"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export function PrintReceiptButton() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      Cetak Struk
    </Button>
  );
}
