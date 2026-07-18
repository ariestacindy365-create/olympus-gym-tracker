"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Exercise {
  id: string;
  name: string;
}

export function ExerciseManager({ exercises: initialExercises }: { exercises: Exercise[] }) {
  const [exercises, setExercises] = useState(initialExercises);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [exercises, search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newName.trim().length < 2) {
      setError("Nama gerakan minimal 2 karakter.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/coach/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah gerakan.");
        return;
      }
      setExercises((prev) => [...prev, data.exercise].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(exercise: Exercise) {
    setEditingId(exercise.id);
    setEditName(exercise.name);
  }

  async function saveEdit(id: string) {
    setActionPendingId(id);
    try {
      const res = await fetch(`/api/coach/exercises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (res.ok) {
        setExercises((prev) =>
          prev.map((ex) => (ex.id === id ? data.exercise : ex)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
      } else {
        alert(data.error ?? "Gagal mengubah gerakan.");
      }
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus gerakan "${name}"?`)) return;
    setActionPendingId(id);
    try {
      const res = await fetch(`/api/coach/exercises/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setExercises((prev) => prev.filter((ex) => ex.id !== id));
      } else {
        alert(data.error ?? "Gagal menghapus gerakan.");
      }
    } finally {
      setActionPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="text"
            placeholder="Nama gerakan baru... (mis. Hip Thrust)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={pending} className="whitespace-nowrap">
            {pending ? "..." : "+ Tambah"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      <Input
        type="text"
        placeholder="Cari gerakan..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <p className="text-xs text-muted">{exercises.length} gerakan</p>

      <div className="flex flex-col gap-2">
        {filtered.map((exercise) => (
          <Card key={exercise.id} className="flex items-center justify-between py-3">
            {editingId === exercise.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs" />
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  disabled={actionPendingId === exercise.id}
                  onClick={() => saveEdit(exercise.id)}
                >
                  Simpan
                </Button>
                <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setEditingId(null)}>
                  Batal
                </Button>
              </div>
            ) : (
              <>
                <span className="font-medium">{exercise.name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="px-2 py-1.5 text-xs"
                    disabled={actionPendingId === exercise.id}
                    onClick={() => startEdit(exercise)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="px-2 py-1.5 text-xs"
                    disabled={actionPendingId === exercise.id}
                    onClick={() => handleDelete(exercise.id, exercise.name)}
                  >
                    Hapus
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
