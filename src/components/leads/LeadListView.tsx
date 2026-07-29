"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppLink } from "@/components/leads/WhatsAppLink";

export interface LeadRow {
  id: string;
  waNumber: string;
  name: string;
  status: string;
  replyCount: number;
  capturedByName: string;
  capturedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  DM: "DM",
  TRIAL: "Trial",
  MEMBER: "Member",
  RETENSI: "Retensi",
  LOST: "Tidak Lanjut",
};

const STATUS_TONE: Record<string, "default" | "success" | "accent" | "danger" | "muted"> = {
  DM: "muted",
  TRIAL: "accent",
  MEMBER: "success",
  RETENSI: "success",
  LOST: "danger",
};

export function LeadListView({ leads }: { leads: LeadRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [qualifiedOnly, setQualifiedOnly] = useState(false);

  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase();
    if (q && !l.name.toLowerCase().includes(q) && !l.waNumber.includes(q)) return false;
    if (status !== "ALL" && l.status !== status) return false;
    if (qualifiedOnly && l.replyCount < 2) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          placeholder="🔍 Cari nama atau nomor WA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[180px]">
          <option value="ALL">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm">
          <input type="checkbox" checked={qualifiedOnly} onChange={(e) => setQualifiedOnly(e.target.checked)} />
          Qualified saja
        </label>
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
              {lead.replyCount >= 2 && <Badge tone="accent">Qualified · {lead.replyCount}x balas</Badge>}
              <Badge tone={STATUS_TONE[lead.status] ?? "default"}>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
              <WhatsAppLink waNumber={lead.waNumber}>WhatsApp</WhatsAppLink>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
