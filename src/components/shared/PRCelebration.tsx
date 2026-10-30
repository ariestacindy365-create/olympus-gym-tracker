"use client";

import { useEffect, useRef, useState } from "react";
import type { PREvent } from "@/lib/barbell";

// The celebration that walks across the bottom of the coach's slideshow when
// a member logs a barbell PR: a lifter carrying a "PR" sign with their name,
// confetti, and a synthesized fanfare. It's an overlay on the slide only, so
// the slideshow layout and the timer beside it never move or get covered.

const POLL_MS = 12_000;
const IN = 2.4;
const HOLD = 2.4;
const OUT = 2.2;
const TOTAL = IN + HOLD + OUT;
const CONFETTI = ["#f5b301", "#2563eb", "#ef4444", "#16a34a", "#0f172a", "#f97316"];

// ---- Sound: synthesized with Web Audio, no files ----
function noise(a: AudioContext, sec: number) {
  const b = a.createBuffer(1, Math.ceil(a.sampleRate * sec), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function step(a: AudioContext, at: number) {
  const src = a.createBufferSource();
  src.buffer = noise(a, 0.12);
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 260;
  const g = a.createGain();
  g.gain.setValueAtTime(0.8, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.11);
  src.connect(f).connect(g).connect(a.destination);
  src.start(at);
  src.stop(at + 0.12);
}
function brass(a: AudioContext, freq: number, at: number, dur: number, vol = 0.22) {
  const o1 = a.createOscillator();
  const o2 = a.createOscillator();
  o1.type = o2.type = "sawtooth";
  o1.frequency.value = freq;
  o2.frequency.value = freq * 1.004;
  const vib = a.createOscillator();
  vib.frequency.value = 5.5;
  const vg = a.createGain();
  vg.gain.value = freq * 0.006;
  vib.connect(vg);
  vg.connect(o1.frequency);
  vg.connect(o2.frequency);
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(900, at);
  f.frequency.linearRampToValueAtTime(3200, at + 0.08);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.04);
  g.gain.setValueAtTime(vol, at + dur - 0.08);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  o1.connect(f);
  o2.connect(f);
  f.connect(g).connect(a.destination);
  for (const n of [o1, o2, vib]) {
    n.start(at);
    n.stop(at + dur + 0.05);
  }
}
function crash(a: AudioContext, at: number) {
  const src = a.createBufferSource();
  src.buffer = noise(a, 1.6);
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 5000;
  const g = a.createGain();
  g.gain.setValueAtTime(0.45, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 1.5);
  src.connect(f).connect(g).connect(a.destination);
  src.start(at);
}
function cheer(a: AudioContext, at: number, dur: number) {
  const src = a.createBufferSource();
  src.buffer = noise(a, dur);
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1400;
  f.Q.value = 0.7;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.3, at + 0.35);
  g.gain.setValueAtTime(0.3, at + dur - 0.9);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(at);
  // A few "woo!" voices gliding up.
  for (let i = 0; i < 5; i++) {
    const o = a.createOscillator();
    o.type = "triangle";
    const s = at + 0.2 + i * 0.28;
    const base = 420 + i * 60;
    o.frequency.setValueAtTime(base, s);
    o.frequency.exponentialRampToValueAtTime(base * 1.7, s + 0.45);
    const vg = a.createGain();
    vg.gain.setValueAtTime(0.0001, s);
    vg.gain.linearRampToValueAtTime(0.05, s + 0.08);
    vg.gain.linearRampToValueAtTime(0.0001, s + 0.6);
    o.connect(vg).connect(a.destination);
    o.start(s);
    o.stop(s + 0.65);
  }
}
function fanfare(a: AudioContext, at: number) {
  brass(a, 392, at, 0.16);
  brass(a, 523.25, at + 0.17, 0.16);
  brass(a, 659.25, at + 0.34, 0.16);
  brass(a, 783.99, at + 0.52, 1.3, 0.26);
  for (const f of [261.63, 329.63, 392]) brass(a, f, at + 0.52, 1.3, 0.12);
  crash(a, at + 0.52);
}

const fmtKg = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });

interface Bit { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; c: string }

/** Polls for new barbell PRs while mounted and plays them one at a time. */
export function PRCelebration({ sound }: { sound: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const signRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queue = useRef<PREvent[]>([]);
  const seen = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  const [current, setCurrent] = useState<PREvent | null>(null);

  useEffect(() => {
    soundRef.current = sound;
    if (sound && !audio.current) {
      // The slideshow was just opened (or 🔊 tapped), which lets audio start.
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audio.current = new Ctor();
    }
    void audio.current?.resume().catch(() => {});
  }, [sound]);

  // Poll for PRs since the slideshow opened; the server's `now` is the next `since`.
  useEffect(() => {
    let since: string | null = null;
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const res = await fetch(`/api/coach/pr-events${since ? `?since=${encodeURIComponent(since)}` : ""}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok || stopped) return;
      const data: { events: PREvent[]; now: string } = await res.json();
      since = data.now;
      for (const e of data.events) {
        if (seen.current.has(e.id)) continue;
        seen.current.add(e.id);
        queue.current.push(e);
      }
      setCurrent((c) => c ?? queue.current.shift() ?? null);
    }
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // Play the current PR: walk in, stop and hop with confetti and the fanfare, walk out.
  useEffect(() => {
    const root = rootRef.current;
    const lane = laneRef.current;
    const walker = walkerRef.current;
    const sign = signRef.current;
    const canvas = canvasRef.current;
    if (!current || !root || !lane || !walker || !sign || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const part = (id: string) => root.querySelector<SVGGElement>(`#prc-${id}`)!;
    const p = {
      body: part("body"), farArm: part("farArm"), farFore: part("farFore"),
      farLeg: part("farLeg"), farShin: part("farShin"), farFoot: part("farFoot"),
      nearLeg: part("nearLeg"), nearShin: part("nearShin"), nearFoot: part("nearFoot"),
    };
    const rot = (el: SVGGElement, deg: number) => el.setAttribute("transform", `rotate(${deg.toFixed(2)})`);
    // Side-view walk: the hip swings the thigh, the knee folds while the leg
    // swings forward, the foot stays roughly flat.
    const leg = (thigh: SVGGElement, shin: SVGGElement, foot: SVGGElement, ph: number) => {
      const hip = -24 * Math.sin(ph);
      const knee = 6 + 52 * Math.pow(Math.max(0, Math.cos(ph)), 1.4);
      rot(thigh, hip);
      rot(shin, knee);
      rot(foot, -(hip + knee) * 0.85);
    };
    const pose = (ph: number, walking: boolean) => {
      if (!walking || reduce) {
        for (const [t, s, f] of [[p.nearLeg, p.nearShin, p.nearFoot], [p.farLeg, p.farShin, p.farFoot]]) {
          rot(t, 0);
          rot(s, 4);
          rot(f, -4);
        }
        rot(p.farArm, -12);
        rot(p.farFore, -14);
        p.body.setAttribute("transform", "");
        return;
      }
      leg(p.nearLeg, p.nearShin, p.nearFoot, ph);
      leg(p.farLeg, p.farShin, p.farFoot, ph + Math.PI);
      rot(p.farArm, -22 * Math.sin(ph));
      rot(p.farFore, -12 - 10 * Math.max(0, Math.sin(ph)));
      p.body.setAttribute("transform", `translate(0 ${(-2.2 * Math.abs(Math.cos(ph))).toFixed(2)})`);
    };

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = lane.clientWidth * dpr;
    canvas.height = lane.clientHeight * dpr;
    let bits: Bit[] = [];
    const a = soundRef.current ? audio.current : null;
    let raf = 0;
    let steps = 0;
    let celebrated = false;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const W = lane.clientWidth;
      const H = lane.clientHeight;
      const ww = walker.offsetWidth;
      const from = -ww - 10;
      const mid = (W - ww) / 2;
      const to = W + 10;
      let x: number;
      let walking = true;
      if (t < IN) x = from + (mid - from) * (t / IN);
      else if (t < IN + HOLD) {
        x = mid;
        walking = false;
      } else x = mid + (to - mid) * Math.min(1, (t - IN - HOLD) / OUT);
      const ph = t * 7.5;
      const ht = t - IN - 0.1;
      const hop = !walking && ht > 0 && ht < 1 && !reduce ? Math.abs(Math.sin(ht * Math.PI * 2)) * H * 0.07 : 0;
      walker.style.transform = `translate(${x}px, ${-hop}px)`;
      pose(ph, walking);
      sign.style.transform = !walking && !reduce ? `rotate(${Math.sin(t * 13) * 4}deg) translateY(${-hop * 0.4}px)` : `rotate(${Math.sin(ph) * 1.5}deg)`;
      if (walking) {
        const n = Math.floor(ph / Math.PI);
        if (n > steps) {
          steps = n;
          if (a) step(a, a.currentTime);
        }
      }
      if (!celebrated && t >= IN) {
        celebrated = true;
        const cx = (mid + ww / 2) * dpr;
        for (let i = 0; i < 120; i++) {
          bits.push({
            x: cx, y: canvas.height * 0.55,
            vx: (Math.random() - 0.5) * canvas.width * 0.009, vy: -Math.random() * canvas.height * 0.05 - canvas.height * 0.02,
            r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, s: (3 + Math.random() * 5) * dpr, c: CONFETTI[i % CONFETTI.length],
          });
        }
        if (a) {
          fanfare(a, a.currentTime + 0.05);
          cheer(a, a.currentTime + 0.35, 2.8);
        }
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const b of bits) {
        b.vy += canvas.height * 0.0022;
        b.x += b.vx;
        b.y += b.vy;
        b.r += b.vr;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.r);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        ctx.restore();
      }
      bits = bits.filter((b) => b.y < canvas.height + 20);
      if (t < TOTAL + 0.4) raf = requestAnimationFrame(frame);
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Next PR in the queue, if any.
        setCurrent(queue.current.shift() ?? null);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [current]);

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ containerType: "inline-size" }}>
      <div ref={laneRef} className="absolute inset-x-0 bottom-0" style={{ height: "36%", visibility: current ? "visible" : "hidden" }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div ref={walkerRef} className="absolute bottom-[3%] left-0 flex h-[92%] items-end" style={{ transform: "translateX(-200%)", willChange: "transform" }}>
          <svg className="block h-full w-auto overflow-visible" viewBox="22 0 118 245" aria-hidden>
            <defs>
              <linearGradient id="prc-skinL" x1="0" x2="1"><stop offset="0" stopColor="#b9824f"/><stop offset=".55" stopColor="#d8a06b"/><stop offset="1" stopColor="#c48a55"/></linearGradient>
              <linearGradient id="prc-skinD" x1="0" x2="1"><stop offset="0" stopColor="#9a6a3e"/><stop offset="1" stopColor="#b47c49"/></linearGradient>
              <linearGradient id="prc-tank" x1="0" x2="1"><stop offset="0" stopColor="#1739a8"/><stop offset=".6" stopColor="#2557e0"/><stop offset="1" stopColor="#1d47c2"/></linearGradient>
              <linearGradient id="prc-shortsG" x1="0" x2="1"><stop offset="0" stopColor="#151c2b"/><stop offset="1" stopColor="#273248"/></linearGradient>
              <radialGradient id="prc-shadowG"><stop offset="0" stopColor="rgba(15,23,42,.32)"/><stop offset="1" stopColor="rgba(15,23,42,0)"/></radialGradient>
            </defs>
            <ellipse id="prc-shadow" cx="82" cy="238" rx="34" ry="5.5" fill="url(#prc-shadowG)"/>
            <g id="prc-body">
              <g transform="translate(76 74)"><g id="prc-farArm">
                <path d="M-6 -3 C-9 8 -7 21 -4.5 32 L4.5 32 C7 21 8.5 8 6 -3 C3 -7 -3 -7 -6 -3 Z" fill="url(#prc-skinD)"/>
                <g transform="translate(0 32)"><g id="prc-farFore">
                  <path d="M-4.5 0 C-5.5 10 -4.5 20 -3 28 L3 28 C4.5 20 5.5 10 4.5 0 Z" fill="url(#prc-skinD)"/>
                  <ellipse cx="0" cy="31.5" rx="4.6" ry="5.4" fill="#9a6a3e"/>
                </g></g>
              </g></g>
              <g transform="translate(78 138)"><g id="prc-farLeg">
                <path d="M-9.5 -4 C-11.5 14 -9.5 34 -6 48 L6 48 C8.5 34 10.5 14 9.5 -4 Z" fill="url(#prc-skinD)"/>
                <path d="M-10.5 -7 L10.5 -7 L10 21 C3 23 -3 23 -9.5 21 Z" fill="#141a27"/>
                <g transform="translate(0 48)"><g id="prc-farShin">
                  <path d="M-6 0 C-10 9 -9 22 -4.5 43 L3 43 C4.5 30 5.5 12 6 0 Z" fill="url(#prc-skinD)"/>
                  <g transform="translate(0 43)"><g id="prc-farFoot">
                    <path d="M-5.5 -4 C-7 1 -5 6.5 0 6.5 L17 6.5 C21 6.5 21.5 2 18 -0.5 C12 -3.5 4 -5 -5.5 -4 Z" fill="#dbe1ea"/>
                    <path d="M-6 5 L19.5 5 L19 7.2 L-5 7.2 Z" fill="#64748b"/>
                  </g></g>
                </g></g>
              </g></g>
              <path d="M75 56 L88 56 L90 66 L74 66 Z" fill="url(#prc-skinD)"/>
              <path d="M71 64 C78 60 88 60 95 66 C101 72 102 86 98 98 C95 108 94 120 92 140 L66 140 C64 124 63 110 64 96 C64 84 66 70 71 64 Z" fill="url(#prc-tank)"/>
              <path d="M76 64 C80 70 87 70 91 64" stroke="#d8a06b" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
              <path d="M92 84 C93 96 90 110 88 124" stroke="rgba(255,255,255,.16)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <text x="81" y="102" textAnchor="middle" fontFamily="Oswald, Impact, sans-serif" fontSize="7" fontWeight="700" fill="#ffffff" letterSpacing=".5" transform="rotate(-4 81 102)">OLYMPUS</text>
              <path d="M64 132 C72 136 84 136 93 132 L94 142 C84 146 72 146 63 142 Z" fill="url(#prc-shortsG)"/>
              <g transform="translate(80 138)"><g id="prc-nearLeg">
                <path d="M-9.5 -4 C-11.5 14 -9.5 34 -6 48 L6 48 C8.5 34 11 14 9.5 -4 Z" fill="url(#prc-skinL)"/>
                <path d="M-10.5 -7 L11 -7 L10.5 21 C3 23.5 -3.5 23.5 -10 21 Z" fill="url(#prc-shortsG)"/>
                <path d="M2 23 C5 30 6 38 5 46" stroke="rgba(0,0,0,.12)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                <g transform="translate(0 48)"><g id="prc-nearShin">
                  <path d="M-6 0 C-10.5 9 -9.5 22 -4.5 43 L3 43 C4.5 30 5.5 12 6 0 Z" fill="url(#prc-skinL)"/>
                  <g transform="translate(0 43)"><g id="prc-nearFoot">
                    <path d="M-5.5 -4 C-7 1 -5 6.5 0 6.5 L17 6.5 C21 6.5 21.5 2 18 -0.5 C12 -3.5 4 -5 -5.5 -4 Z" fill="#ffffff"/>
                    <path d="M2 -3 C6 -2 10 -1 13 1" stroke="#2557e0" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                    <path d="M-6 5 L19.5 5 L19 7.2 L-5 7.2 Z" fill="#475569"/>
                  </g></g>
                </g></g>
              </g></g>
              <path d="M74 40 C73 26 82 19 90 20 C98 21 102 29 101 36 L104.5 43.5 C105.5 45.5 103.5 46.5 101.5 46.5 L100.5 50.5 C99.5 54.5 95.5 56.5 90.5 56 L84 56 C78 55 74 49 74 40 Z" fill="url(#prc-skinL)"/>
              <path d="M72.5 39 C70.5 24 82 16 92.5 18 C100 19.5 103.5 25.5 102.5 31 C96.5 27 88.5 26.5 82.5 29.5 C79.5 31.5 77.5 35.5 76.5 41.5 Z" fill="#1b130d"/>
              <ellipse cx="80.5" cy="40.5" rx="3.2" ry="4.6" fill="#b47c49"/>
              <path d="M93.5 33.5 L99 33" stroke="#1b130d" strokeWidth="1.6" strokeLinecap="round"/>
              <ellipse cx="96.5" cy="37" rx="1.5" ry="1.7" fill="#1b130d"/>
              <path d="M95.5 50.5 C97.5 51.5 99 51 100 50" stroke="#7c3f1d" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              <path d="M75.1 72.5 L91.4 101.8 Q95 104.5 98.6 98.2 L84.9 67.5 Q80 63.5 75.1 72.5 Z" fill="url(#prc-skinL)"/>
              <path d="M91.5 98.1 L106.2 72.5 Q109 69.5 111.8 75.5 L98.5 101.9 Q95 104.5 91.5 98.1 Z" fill="url(#prc-skinL)"/>
              <rect x="108" y="-12" width="5" height="160" rx="2.5" fill="#8a5a2b"/>
              <rect x="108" y="-12" width="1.6" height="160" rx=".8" fill="#a8743f"/>
              <ellipse cx="110.5" cy="69" rx="6" ry="6.6" fill="#c48a55"/>
            </g>
          </svg>

          <div
            ref={signRef}
            className="relative self-start whitespace-nowrap border-slate-900 bg-white"
            style={{ marginLeft: "-1.6cqw", marginTop: "2%", borderWidth: "0.3cqw", borderRadius: "0.9cqw", padding: "0.6cqw 1.2cqw 0.7cqw", boxShadow: "0 0.5cqw 0 rgb(0 0 0 / .3)", transformOrigin: "0% 100%" }}
          >
            <div className="font-display font-bold leading-none text-red-600" style={{ fontSize: "2.6cqw" }}>
              PR{" "}
              <small className="text-slate-900" style={{ fontSize: "1.2cqw", letterSpacing: ".12em", marginLeft: ".4cqw", verticalAlign: ".55em" }}>
                🏆 BARU
              </small>
            </div>
            <div className="font-display font-bold uppercase leading-tight text-slate-900" style={{ fontSize: "1.9cqw" }}>
              {current?.memberName}
            </div>
            <div className="font-bold text-blue-700" style={{ fontSize: "1.15cqw" }}>
              {current && `${current.exercise} ${fmtKg(current.weight)} kg × ${current.reps}`}
              {current?.delta != null && current.delta > 0 && <span className="text-green-600"> (+{fmtKg(current.delta)} kg)</span>}
              {current?.delta == null && <span className="text-green-600"> · pertama kali!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
