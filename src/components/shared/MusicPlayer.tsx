"use client";

import { useEffect, useRef, useState } from "react";
import { onMusicDuck, parseYouTube } from "@/lib/musicDuck";

// Music for the class TV: a YouTube video or playlist played inside the
// slideshow, so it can turn itself down while a PR is announced and back
// up after. Shown as a small player in the corner, or hidden (it keeps
// playing; the 🎵 button brings it back). The link and volume are
// remembered on this TV.

const LINK_KEY = "olympus-music-link";
const VOLUME_KEY = "olympus-music-volume";
const DUCKED_SHARE = 0.2;

interface YTPlayer {
  setVolume(v: number): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  setShuffle?(on: boolean): void;
  nextVideo?(): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube tidak bisa dimuat"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: only this session remembers it.
  }
};

export function MusicPlayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [link, setLink] = useState(() => read(LINK_KEY) ?? "");
  const [draft, setDraft] = useState(link);
  const [volume, setVolume] = useState(() => Number(read(VOLUME_KEY) ?? 60) || 60);
  const [view, setView] = useState<"mini" | "hidden" | "edit">(() => (read(LINK_KEY) ? "mini" : "hidden"));
  const [playing, setPlaying] = useState(false);
  const [ducked, setDucked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = useRef(0);
  const volumeRef = useRef(volume);
  const duckedRef = useRef(false);

  // Make the player for the saved link.
  useEffect(() => {
    const src = parseYouTube(link);
    const host = hostRef.current;
    if (!src || !host) return;
    let cancelled = false;
    const el = document.createElement("div");
    host.appendChild(el);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(el, {
          width: "100%",
          height: "100%",
          videoId: src.videoId ?? undefined,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            ...(src.listId ? { list: src.listId, listType: "playlist" } : { loop: 1, playlist: src.videoId }),
          },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              shown.current = volumeRef.current * (duckedRef.current ? DUCKED_SHARE : 1);
              e.target.setVolume(shown.current);
              e.target.playVideo();
            },
            onStateChange: (e: { data: number }) => setPlaying(e.data === YT.PlayerState.PLAYING),
            onError: (e: { target: YTPlayer }) => {
              // In a playlist, skip a song that can't play outside YouTube.
              if (src.listId && e.target.nextVideo) e.target.nextVideo();
              else setError("Video ini tidak bisa diputar di luar YouTube. Coba link lain.");
            },
          },
        });
      })
      .catch(() => setError("YouTube tidak bisa dimuat. Cek internet TV."));
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      el.remove();
    };
  }, [link]);

  // Fade to the volume it should be at: lower while a PR is celebrated.
  useEffect(() => onMusicDuck((on) => {
    duckedRef.current = on;
    setDucked(on);
  }), []);
  useEffect(() => {
    volumeRef.current = volume;
    const target = volume * (ducked ? DUCKED_SHARE : 1);
    const step = ducked ? 6 : 2; // down fast, back up gently
    if (!link) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const diff = target - shown.current;
      if (Math.abs(diff) <= step) {
        shown.current = target;
        window.clearInterval(id);
      } else shown.current += Math.sign(diff) * step;
      p.setVolume(Math.round(shown.current));
    }, 60);
    return () => window.clearInterval(id);
  }, [volume, ducked, link]);

  function start() {
    const src = parseYouTube(draft);
    if (!src) {
      setError("Tempel link video atau playlist YouTube.");
      return;
    }
    setError(null);
    write(LINK_KEY, draft.trim());
    setLink(draft.trim());
    setView("mini");
  }
  function changeVolume(d: number) {
    const v = Math.max(0, Math.min(100, volume + d));
    setVolume(v);
    write(VOLUME_KEY, String(v));
  }
  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  }

  const btn = "rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 hover:bg-black/85";
  return (
    <div className={`fixed bottom-16 left-4 z-[55] flex flex-col items-start gap-2 text-white transition-opacity ${link && view === "hidden" ? "opacity-30 hover:opacity-100" : ""}`} data-music-player>
      {/* The player keeps playing while hidden (just invisible). */}
      <div
        className={`overflow-hidden rounded-xl shadow-overlay ring-1 ring-white/20 transition-opacity ${link && view !== "hidden" ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ width: 256, height: 144 }}
        aria-hidden={view === "hidden"}
      >
        <div ref={hostRef} className="h-full w-full bg-black" />
      </div>
      {view === "edit" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
          className="flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-xl bg-black/85 p-3 ring-1 ring-white/20"
        >
          <label className="text-xs font-semibold">
            Link YouTube (video atau playlist)
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=…"
              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
              autoFocus
            />
          </label>
          <p className="text-[11px] text-white/60">Musik otomatis mengecil saat ada pengumuman PR, lalu naik lagi.</p>
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold">▶ Putar</button>
            <button type="button" onClick={() => setView(link ? "mini" : "hidden")} className={btn}>Batal</button>
          </div>
        </form>
      )}
      {error && <p className="max-w-[22rem] rounded-lg bg-red-500/80 px-3 py-1.5 text-xs">{error}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {link && view !== "edit" ? (
          <>
            <button type="button" onClick={() => setView(view === "hidden" ? "mini" : "hidden")} className={btn} title={view === "hidden" ? "Tampilkan pemutar" : "Sembunyikan pemutar (musik tetap jalan)"}>
              {view === "hidden" ? "🎵 Tampilkan" : "🎵 Sembunyikan"}
            </button>
            {view === "mini" && (
              <>
                <button type="button" onClick={togglePlay} className={btn} aria-label={playing ? "Jeda musik" : "Putar musik"}>{playing ? "⏸" : "▶"}</button>
                <button type="button" onClick={() => changeVolume(-10)} className={btn} aria-label="Kecilkan musik">🔉</button>
                <span className="text-xs tabular-nums text-white/80">{volume}%{ducked ? " · PR" : ""}</span>
                <button type="button" onClick={() => changeVolume(10)} className={btn} aria-label="Besarkan musik">🔊</button>
                <button type="button" onClick={() => { setDraft(link); setView("edit"); }} className={btn}>Ganti link</button>
              </>
            )}
          </>
        ) : view !== "edit" ? (
          <button type="button" onClick={() => setView("edit")} className={btn}>🎵 Musik</button>
        ) : null}
      </div>
    </div>
  );
}
