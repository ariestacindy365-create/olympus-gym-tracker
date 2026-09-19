"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { buildOlympusSaleReceipt, type OlympusSaleReceiptData } from "@/lib/escpos/saleReceipt";
import { getThermalPrinterMode, printBytesThermal } from "@/lib/thermal-printer";

async function doPrint(receipt: OlympusSaleReceiptData): Promise<string | null> {
  const mode = getThermalPrinterMode();
  if (mode) {
    try {
      await printBytesThermal(buildOlympusSaleReceipt(receipt), mode);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Gagal mencetak struk";
    }
  }
  window.print();
  return null;
}

export function PrintSaleReceiptButton({ receipt }: { receipt: OlympusSaleReceiptData }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    doPrint(receipt).then((err) => {
      if (!cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClick() {
    setError(await doPrint(receipt));
  }

  return (
    <div className="flex flex-col items-center gap-2 print:hidden">
      <Button type="button" onClick={handleClick}>
        Cetak Struk
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
