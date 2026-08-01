"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/leadStatusLabels";
import { waOpeningMessage } from "@/lib/waScripts";

export interface LeadRow {
  id: string;
  waNumber: string;
  name: string;
  status: string;
  capturedByName: string;
  capturedAt: string;
}

export function LeadListView({ leads }: { leads: LeadRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase();
    if (q && !l.name.toLowerCase().includes(q) && !l.waNumber.includes(q)) return false;
    if (status !== "ALL" && l.status !== status) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          placeholder="🔍 Cari nama atau nomor WA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatus("ALL")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              status === "ALL" ? "bg-accent text-background" : "bg-surface-2 text-muted"
            }`}
          >
            Semua ({leads.length})
          </button>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                status === value ? "bg-accent text-background" : "bg-surface-2 text-muted"
              }`}
            >
              {label} ({leads.filter((l) => l.status === value).length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm text-muted">Tidak ada lead yang cocok.</p>}
        {filtered.map((lead) => (
          <Card key={lead.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/leads/${lead.id}`} className="flex-1 hover:text-accent">
              <p className="font-medium">{lead.name}</p>
              <p className="text-xs text-muted">
                {lead.waNumber} · dicapture oleh {lead.capturedByName} ·{" "}
                {new Date(lead.capturedAt).toLocaleDateString("id-ID")}
              </p>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[lead.status] ?? "default"}>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
              <WhatsAppLink
                waNumber={lead.waNumber}
                message={lead.status === "DM" ? waOpeningMessage(lead.name) : undefined}
              >
                WhatsApp
              </WhatsAppLink>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
