"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_TIMER,
  PREP_SEC,
  TIMER_MODES,
  formatClock,
  frameAt,
  timerTitle,
  workoutSeconds,
  type TimerConfig,
  type TimerMode,
} from "@/lib/classTimer";
import { formatMinutes, parseMinutes } from "@/lib/roundScheme";

interface ClassTimerProps {
  initial?: TimerConfig | null;
  /** e.g. "Round 4 · Upper Body Pull" when opened from a slide. */
  subtitle?: string;
  /**
   * "overlay" covers the screen, "page" fills its container, "side" is the
   * right-hand quarter next to the slideshow so the program stays visible.
   * Switching between side and overlay on the same instance keeps the time.
   */
  variant?: "overlay" | "page" | "side";
  /** Side panel ⇄ full-screen toggle (slideshow only). */
  onToggleSize?: () => void;
  onClose?: () => void;
}

/** EMOM interval: accepts 2,5 / 2.5 as well as whole minutes. */
function MinutesField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(formatMinutes(value));
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
      Setiap
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.,]/g, "");
          setText(v);
          const n = parseMinutes(v);
          if (n) onChange(n);
        }}
        className={numCls}
        aria-label="Setiap min"
      />
      min
    </label>
  );
}

/**
 * A referee's pea whistle on `ctx` at time `at`: a ~2.9 kHz tone that the pea
 * trills about 34 times a second (pitch and level wobble), plus a little
 * breath noise. Held at full level with a short fade, so the laptop / speaker
 * volume is the one knob that sets how loud it is. Exported for previews.
 */
export function scheduleWhistle(ctx: BaseAudioContext, at: number, ms: number, pitch = 1) {
  const end = at + ms / 1000;
  const freq = 2900 * pitch;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.linearRampToValueAtTime(0.9, at + 0.015);
  out.gain.setValueAtTime(0.9, Math.max(at + 0.015, end - 0.05));
  out.gain.linearRampToValueAtTime(0.0001, end);
  out.connect(ctx.destination);

  const tone = ctx.createOscillator();
  tone.frequency.value = freq;
  const trill = ctx.createOscillator();
  trill.frequency.value = 34;
  const trillPitch = ctx.createGain();
  trillPitch.gain.value = 140 * pitch;
  trill.connect(trillPitch).connect(tone.frequency);
  const level = ctx.createGain();
  level.gain.value = 0.7;
  const trillLevel = ctx.createGain();
  trillLevel.gain.value = 0.3;
  trill.connect(trillLevel).connect(level.gain);
  tone.connect(level).connect(out);

  const len = Math.ceil(ctx.sampleRate * (ms / 1000));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const breath = ctx.createBufferSource();
  breath.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = 6;
  const breathLevel = ctx.createGain();
  breathLevel.gain.value = 0.25;
  breath.connect(band).connect(breathLevel).connect(out);

  for (const node of [tone, trill, breath]) {
    node.start(at);
    node.stop(end);
  }
}

let audioCtx: AudioContext | null = null;
function whistle(ms: number, pitch = 1) {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    void audioCtx.resume();
    scheduleWhistle(audioCtx, audioCtx.currentTime, ms, pitch);
  } catch {
    // Audio is a bonus; the clock still works without it.
  }
}

const PHASE_STYLE = {
  idle: { color: "#ffffff", label: "SIAP" },
  prep: { color: "#facc15", label: "SIAP-SIAP" },
  work: { color: "#22c55e", label: "GO!" },
  rest: { color: "#ef4444", label: "REST" },
  done: { color: "#ffffff", label: "SELESAI" },
} as const;

const numCls =
  "w-16 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-center text-base font-semibold text-white focus:border-white/60 focus:outline-none";

/**
 * Class timer in the style of the CrossFit box timers: huge digits, a 10s
 * countdown, round counter, green for work / red for rest, and a whistle on
 * the last 3 seconds of every interval.
 */
export function ClassTimer({ initial, subtitle, variant = "page", onToggleSize, onClose }: ClassTimerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<TimerConfig>(initial ?? DEFAULT_TIMER);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const startRef = useRef(0);
  const baseRef = useRef(0);
  const lastWhistleRef = useRef<string>("");

  const started = elapsed > 0 || running;
  const stoppedEarly = finishedAt !== null;
  const frame = stoppedEarly ? { ...frameAt(config, finishedAt), phase: "done" as const } : frameAt(config, elapsed);
  const phase = !started ? "idle" : frame.phase;
  const countDown = phase === "prep" || config.mode !== "FOR_TIME";
  const shownClock = !started ? (config.mode === "FOR_TIME" ? 0 : config.mode === "AMRAP" ? config.minutes * 60 : frameAt(config, PREP_SEC).clock) : frame.clock;

  // Tick while running; time comes from performance.now(), not the tick count.
  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now();
    const end = PREP_SEC + workoutSeconds(config);
    const id = setInterval(() => {
      const e = baseRef.current + (performance.now() - startRef.current) / 1000;
      if (e >= end) {
        baseRef.current = end;
        setElapsed(end);
        setRunning(false);
      } else setElapsed(e);
    }, 100);
    return () => clearInterval(id);
  }, [running, config]);

  // Whistle on 3-2-1 and on every phase change (a long one at the end).
  useEffect(() => {
    if (!running && frameAt(config, elapsed).phase !== "done") return;
    const f = frameAt(config, elapsed);
    const left = Math.ceil(f.phaseLeft - 1e-6);
    const key = `${f.phase}-${f.round}-${left}`;
    if (key === lastWhistleRef.current) return;
    const prev = lastWhistleRef.current;
    lastWhistleRef.current = key;
    if (f.phase === "done") whistle(1200);
    else if (prev && !prev.startsWith(`${f.phase}-${f.round}-`)) whistle(550, f.phase === "rest" ? 0.85 : 1);
    else if (left <= 3 && left >= 1) whistle(150);
  }, [elapsed, running, config]);

  const reset = useCallback(() => {
    setRunning(false);
    baseRef.current = 0;
    lastWhistleRef.current = "";
    setElapsed(0);
    setFinishedAt(null);
  }, []);

  const toggle = useCallback(() => {
    if (finishedAt !== null || frameAt(config, elapsed).phase === "done") return;
    if (running) {
      baseRef.current = elapsed;
      setRunning(false);
    } else {
      whistle(90);
      setRunning(true);
    }
  }, [running, elapsed, config, finishedAt]);

  function finishNow() {
    baseRef.current = elapsed;
    setRunning(false);
    setFinishedAt(elapsed);
    whistle(1200);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      } else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "Escape" && onClose) {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [toggle, reset, onClose]);

  useEffect(() => {
    if (!running) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [running]);

  function set<K extends keyof TimerConfig>(key: K, value: TimerConfig[K]) {
    reset();
    setConfig((c) => ({ ...c, [key]: value }));
  }
  const num = (key: keyof TimerConfig, label: string, suffix: string) => (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
      {label}
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={config[key] as number}
        onChange={(e) => set(key, Math.max(1, Math.floor(Number(e.target.value) || 1)) as never)}
        className={numCls}
        aria-label={`${label} ${suffix}`.trim()}
      />
      {suffix}
    </label>
  );

  const style = PHASE_STYLE[phase];
  const showRounds = config.mode === "EMOM" || config.mode === "TABATA";
  const clockText = formatClock(shownClock, countDown);

  if (variant === "side") {
    return (
      <div
        ref={rootRef}
        className="relative flex w-full shrink-0 flex-col items-center justify-center gap-3 overflow-hidden border-t border-white/10 bg-[#05080f] px-3 py-4 text-center text-white landscape:h-full landscape:w-1/4 landscape:border-l landscape:border-t-0"
        style={{ backgroundImage: "radial-gradient(30rem 20rem at 50% 0%, rgb(37 99 235 / 0.18), transparent)" }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-white/10">
          <div className="h-full transition-[width] duration-150" style={{ width: `${(started ? frame.phaseProgress : 0) * 100}%`, background: style.color }} />
        </div>
        <div className="flex w-full flex-col items-center gap-0.5">
          {subtitle && <p className="w-full truncate text-[11px] text-white/50 lg:text-sm">{subtitle}</p>}
          <p className="w-full font-display text-sm font-bold tracking-[0.12em] text-white/80 lg:text-xl">{timerTitle(config)}</p>
        </div>
        <p className="font-display text-2xl font-bold tracking-[0.25em] lg:text-4xl" style={{ color: style.color }}>
          {style.label}
        </p>
        <p
          className="tabular font-display font-bold leading-none"
          style={{ color: style.color, fontSize: "max(52px, min(9vw, 26dvh))", textShadow: `0 0 50px ${style.color}33` }}
          data-clock
        >
          {clockText}
        </p>
        <p className="text-sm font-semibold text-white/80 lg:text-xl">
          {showRounds ? (
            <>
              ROUND <span className="text-white">{started ? frame.round : 1}</span> / {frame.rounds}
            </>
          ) : config.mode === "FOR_TIME" ? (
            <>CAP {formatClock(config.minutes * 60, false)}</>
          ) : (
            <span className="text-white/60">Total {formatClock(workoutSeconds(config), false)}</span>
          )}
        </p>
        <div className="flex w-full flex-col items-stretch gap-2 px-1 lg:px-3">
          <button
            type="button"
            onClick={toggle}
            disabled={phase === "done"}
            className="rounded-xl bg-[#22c55e] px-4 py-2.5 text-base font-bold text-black hover:brightness-110 disabled:opacity-40 lg:py-3 lg:text-lg"
          >
            {running ? "⏸ Jeda" : started ? "▶ Lanjut" : "▶ Mulai"}
          </button>
          {config.mode === "FOR_TIME" && running && frame.phase === "work" && (
            <button type="button" onClick={finishNow} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-black">
              🏁 Selesai
            </button>
          )}
          <div className="flex justify-center gap-2">
            <button type="button" onClick={reset} aria-label="Reset timer" className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">
              ↺
            </button>
            {onToggleSize && (
              <button type="button" onClick={onToggleSize} aria-label="Perbesar timer" className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">
                ⛶
              </button>
            )}
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Tutup timer" className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`flex flex-col bg-[#05080f] text-white ${
        variant === "overlay" ? "fixed inset-0 z-[70]" : "min-h-[80vh] rounded-2xl"
      }`}
      style={{ backgroundImage: "radial-gradient(60rem 30rem at 50% 0%, rgb(37 99 235 / 0.18), transparent)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div role="tablist" aria-label="Mode timer" className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
          {TIMER_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={config.mode === m.id}
              onClick={() => set("mode", m.id as TimerMode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition ${
                config.mode === m.id ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {variant === "page" && (
          <button
            type="button"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen())?.catch(() => {})}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            ⛶ Layar penuh
          </button>
          )}
          {onToggleSize && (
            <button type="button" onClick={onToggleSize} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
              ▭ Tampilkan program
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black">
              ✕ Tutup
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pt-4">
        {config.mode === "FOR_TIME" && num("minutes", "Time cap", "min")}
        {config.mode === "AMRAP" && num("minutes", "Durasi", "min")}
        {config.mode === "EMOM" && (
          <>
            <MinutesField value={config.intervalMin} onChange={(n) => set("intervalMin", n)} />
            {num("rounds", "Jumlah", "set")}
          </>
        )}
        {config.mode === "TABATA" && (
          <>
            {num("rounds", "Section", "")}
            {num("workSec", "Work", "detik")}
            {num("restSec", "Rest", "detik")}
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-2 py-4 text-center">
        <p className="font-display text-xl font-bold tracking-[0.2em] text-white/70 sm:text-2xl">{timerTitle(config)}</p>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
        <p className="mt-4 font-display text-3xl font-bold tracking-[0.3em] sm:text-4xl" style={{ color: style.color }}>
          {style.label}
        </p>
        <p
          className="tabular font-display font-bold leading-none"
          style={{ color: style.color, fontSize: "min(30vw, 46vh)", textShadow: `0 0 60px ${style.color}33` }}
          aria-live="off"
          data-clock
        >
          {clockText}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-lg font-semibold text-white/80 sm:text-2xl">
          {showRounds && (
            <span>
              ROUND <span className="text-white">{started ? frame.round : 1}</span> / {frame.rounds}
            </span>
          )}
          {config.mode === "FOR_TIME" && <span>CAP {formatClock(config.minutes * 60, false)}</span>}
          {config.mode !== "FOR_TIME" && <span className="text-white/50">Total {formatClock(workoutSeconds(config), false)}</span>}
        </div>
        <div className="mt-5 h-2 w-full max-w-3xl overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-150"
            style={{ width: `${(started ? frame.phaseProgress : 0) * 100}%`, background: style.color }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-6">
        <button
          type="button"
          onClick={toggle}
          disabled={phase === "done"}
          className="min-w-40 rounded-2xl bg-[#22c55e] px-8 py-4 text-xl font-bold text-black shadow-lg transition hover:brightness-110 disabled:opacity-40"
        >
          {running ? "⏸ Jeda" : started ? "▶ Lanjut" : "▶ Mulai"}
        </button>
        {config.mode === "FOR_TIME" && running && frame.phase === "work" && (
          <button type="button" onClick={finishNow} className="rounded-2xl bg-white px-6 py-4 text-xl font-bold text-black">
            🏁 Selesai
          </button>
        )}
        <button type="button" onClick={reset} className="rounded-2xl bg-white/10 px-6 py-4 text-xl font-bold hover:bg-white/20">
          ↺ Reset
        </button>
      </div>
      <p className="pb-4 text-center text-xs text-white/40">Spasi = mulai/jeda · R = reset{onClose ? " · Esc = tutup" : ""}</p>
    </div>
  );
}
