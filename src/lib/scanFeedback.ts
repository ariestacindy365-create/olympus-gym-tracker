// Synthesizes a short beep instead of shipping an audio file — a scanner at
// a physical counter needs instant, glanceable confirmation that a scan
// landed without the admin having to look at the screen. Vibration is a
// mobile-only bonus (most desktop browsers just no-op on the call).
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctor();
  return sharedAudioCtx;
}

function beep(frequency: number, durationMs: number, startAt = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.15;
  oscillator.connect(gain).connect(ctx.destination);
  const start = ctx.currentTime + startAt;
  oscillator.start(start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  oscillator.stop(start + durationMs / 1000);
}

export function scanSuccessFeedback() {
  beep(880, 90);
  navigator.vibrate?.(40);
}

export function scanErrorFeedback() {
  beep(220, 90);
  beep(220, 90, 0.12);
  navigator.vibrate?.([40, 60, 40]);
}
