"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MemberStatusBadge } from "@/components/coach/MemberStatusBadge";

interface Member {
  id: string;
  name: string;
  email: string;
  online: boolean;
  loggedToday: boolean;
}

export function MemberManager({ members: initialMembers }: { members: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Masukkan email member.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/coach/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mendaftarkan member.");
        return;
      }
      setMembers((prev) => [
        ...prev,
        { id: data.member.id, name: data.member.name, email: data.member.email, online: false, loggedToday: false },
      ]);
      setEmail("");
      setName("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function handleResetPin(id: string) {
    if (!confirm("Reset PIN member ini ke 1111?")) return;
    setActionPendingId(id);
    try {
      await fetch(`/api/coach/members/${id}/reset-pin`, { method: "POST" });
      alert("PIN berhasil direset ke 1111.");
    } finally {
      setActionPendingId(null);
    }
  }

  function startEdit(member: Member) {
    setEditingId(member.id);
    setEditName(member.name);
  }

  async function saveEdit(id: string) {
    setActionPendingId(id);
    try {
      const res = await fetch(`/api/coach/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name: data.member.name } : m)));
        setEditingId(null);
      }
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleDelete(id: string, memberName: string) {
    if (!confirm(`Hapus ${memberName}? Semua topset & rekor member ini akan hilang permanen.`)) return;
    setActionPendingId(id);
    try {
      const res = await fetch(`/api/coach/members/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setActionPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Daftarkan Member Baru</h2>
        <p className="mb-3 text-xs text-muted">PIN otomatis 1111 — beri tahu member, bisa di-reset kapan saja.</p>
        <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="email member (wajib)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input type="text" placeholder="nama (opsional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={pending} className="whitespace-nowrap">
            {pending ? "..." : "+ Tambah"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <Card key={member.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              {editingId === member.id ? (
                <div className="flex items-center gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs" />
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    disabled={actionPendingId === member.id}
                    onClick={() => saveEdit(member.id)}
                  >
                    Simpan
                  </Button>
                  <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setEditingId(null)}>
                    Batal
                  </Button>
                </div>
              ) : (
                <>
                  <Link href={`/coach/members/${member.id}`} className="font-medium hover:text-accent">
                    {member.name}
                  </Link>
                  <p className="text-xs text-muted">{member.email}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MemberStatusBadge online={member.online} loggedToday={member.loggedToday} />
              {editingId !== member.id && (
                <>
                  <Button
                    variant="ghost"
                    className="px-2 py-1.5 text-xs"
                    disabled={actionPendingId === member.id}
                    onClick={() => startEdit(member)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1.5 text-xs"
                    disabled={actionPendingId === member.id}
                    onClick={() => handleResetPin(member.id)}
                  >
                    Reset PIN
                  </Button>
                  <Button
                    variant="danger"
                    className="px-2 py-1.5 text-xs"
                    disabled={actionPendingId === member.id}
                    onClick={() => handleDelete(member.id, member.name)}
                  >
                    Hapus
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
