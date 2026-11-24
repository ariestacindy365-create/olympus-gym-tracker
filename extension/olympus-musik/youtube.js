// On YouTube: turn the music down to 20% fast (0.4 s) while Olympus
// announces a PR, then back up to where it was, gently (1.5 s).
const DUCKED = 0.2;
let saved = null; // volume of each player before ducking
let timer = null;

function players() {
  return [...document.querySelectorAll("video, audio")];
}

function fade(targets, ms) {
  clearInterval(timer);
  const start = targets.map(([el]) => el.volume);
  const t0 = performance.now();
  timer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    targets.forEach(([el, to], i) => {
      el.volume = Math.max(0, Math.min(1, start[i] + (to - start[i]) * k));
    });
    if (k >= 1) clearInterval(timer);
  }, 30);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (typeof msg?.olympusDuck !== "boolean") return;
  if (msg.olympusDuck) {
    const els = players();
    if (!saved) saved = new Map(els.map((el) => [el, el.volume]));
    fade(els.map((el) => [el, (saved.get(el) ?? el.volume) * DUCKED]), 400);
  } else if (saved) {
    const back = [...saved.entries()].filter(([el]) => el.isConnected);
    saved = null;
    fade(back, 1500);
  }
});
