"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LiveBoardRow, type LiveRow } from "@/components/coach/LiveBoardRow";
import { PRToast, type PREvent } from "@/components/coach/PRToast";
import { CLASS_SESSIONS, getCurrentClassSession, isWithinSession } from "@/lib/classSessions";

const POLL_INTERVAL_MS = 4000;
const ALL_EXERCISES = "__all__";

interface Member {
  id: string;
  name: string;
  online: boolean;
}

interface ExerciseOption {
  id: string;
  name: string;
}

interface LiveBoardProps {
  exercises: ExerciseOption[];
  defaultExerciseId: string | null;
}

export function LiveBoard({ exercises, defaultExerciseId }: LiveBoardProps) {
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [toast, setToast] = useState<PREvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const seenPRIds = useRef(new Set<string>());

  const [sessionFilter, setSessionFilter] = useState("auto");
  const [exerciseFilter, setExerciseFilter] = useState(defaultExerciseId ?? exercises[0]?.id ?? "");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/coach/board", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { rows: LiveRow[]; members: Member[]; prEvents: PREvent[] } = await res.json();
        if (cancelled) return;

        setRows(data.rows);
        setMembers(data.members);
        setLoaded(true);

        const unseen = data.prEvents.find((e) => !seenPRIds.current.has(e.id));
        if (unseen) {
          seenPRIds.current.add(unseen.id);
          setToast(unseen);
        }
      } catch {
        // ignore transient poll failures
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeSession = useMemo(() => {
    if (sessionFilter === "all") return null;
    if (sessionFilter === "auto") return getCurrentClassSession();
    return CLASS_SESSIONS.find((s) => s.id === sessionFilter) ?? null;
  }, [sessionFilter]);

  const showingAllExercises = exerciseFilter === ALL_EXERCISES;

  const { filteredRows, showingAllFallback } = useMemo(() => {
    const forExercise = showingAllExercises ? rows : rows.filter((r) => r.exerciseId === exerciseFilter);
    const bySession = forExercise.filter(
      (r) => !activeSession || isWithinSession(new Date(r.updatedAt), activeSession)
    );
    // In "auto" mode, don't let an empty current-class window hide sets a
    // member already logged earlier today in a different class — fall back
    // to today's full list rather than showing a misleading "no data" board.
    const fallback = sessionFilter === "auto" && activeSession !== null && bySession.length === 0;
    return { filteredRows: fallback ? forExercise : bySession, showingAllFallback: fallback };
  }, [rows, exerciseFilter, activeSession, sessionFilter, showingAllExercises]);

  const isTodaysMovement = exerciseFilter.length > 0 && exerciseFilter === defaultExerciseId;

  // No leaderboard ranking — only members currently online, alphabetical by name.
  const rowByMemberId = new Map(filteredRows.map((r) => [r.memberId, r]));
  const allMembers = members.filter((m) => m.online).sort((a, b) => a.name.localeCompare(b.name, "id"));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className="sm:max-w-xs">
            <option value="auto">Otomatis (ikut jam)</option>
            {CLASS_SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="all">Semua</option>
          </Select>
          <div className="flex items-center gap-2">
            <Select
              value={exerciseFilter}
              onChange={(e) => setExerciseFilter(e.target.value)}
              className="sm:max-w-xs"
            >
              <option value={ALL_EXERCISES}>Semua Gerakan</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </Select>
            {isTodaysMovement && <Badge tone="accent">Gerakan Hari Ini</Badge>}
          </div>
        </div>

        {showingAllFallback && (
          <p className="mb-2 text-xs text-muted">
            Belum ada yang catat di jam kelas sekarang — menampilkan semua catatan hari ini.
          </p>
        )}

        {!loaded ? (
          <p className="text-sm text-muted">Memuat live board...</p>
        ) : allMembers.length === 0 ? (
          <p className="text-sm text-muted">Belum ada member yang online.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allMembers.map((m) => (
              <LiveBoardRow
                key={m.id}
                memberId={m.id}
                memberName={m.name}
                online={m.online}
                row={rowByMemberId.get(m.id) ?? null}
              />
            ))}
          </div>
        )}
      </Card>

      {toast && <PRToast event={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
