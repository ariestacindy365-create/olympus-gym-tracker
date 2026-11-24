// Olympus Musik: when the slideshow announces a PR, turn every YouTube tab
// down to 20% (0.4 s), then back to where it was (1.5 s).
//
// The volume is set from inside the YouTube page through its own player
// (so YouTube's volume slider follows), falling back to the <video>
// element (YouTube Music). This is injected on demand, so it also works on
// YouTube tabs that were already open before the extension was installed.

const YOUTUBE = ["https://www.youtube.com/*", "https://music.youtube.com/*"];
const OLYMPUS = ["https://olympus-gym-tracker.vercel.app/*", "http://localhost/*"];

// Runs in the YouTube page itself.
function duck(on) {
  const DUCKED = 0.2;
  const w = window;
  const player = document.getElementById("movie_player");
  const api = player && typeof player.getVolume === "function" && typeof player.setVolume === "function" ? player : null;
  const media = [...document.querySelectorAll("video, audio")];
  const get = () => (api ? api.getVolume() : (media[0] ? media[0].volume : 1) * 100);
  const set = (v) => {
    if (api) api.setVolume(Math.round(v));
    else media.forEach((m) => (m.volume = Math.max(0, Math.min(1, v / 100))));
  };
  clearInterval(w.__olympusFade);
  const from = get();
  let to;
  if (on) {
    if (w.__olympusVolume == null) w.__olympusVolume = from;
    to = w.__olympusVolume * DUCKED;
  } else {
    if (w.__olympusVolume == null) return;
    to = w.__olympusVolume;
    w.__olympusVolume = null;
  }
  const ms = on ? 400 : 1500;
  const t0 = performance.now();
  w.__olympusFade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    set(from + (to - from) * k);
    if (k >= 1) clearInterval(w.__olympusFade);
  }, 30);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (typeof msg?.olympusDuck !== "boolean") return;
  chrome.tabs.query({ url: YOUTUBE }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id == null) continue;
      chrome.scripting.executeScript({ target: { tabId: tab.id }, world: "MAIN", func: duck, args: [msg.olympusDuck] }).catch(() => {});
    }
  });
});

// Just installed or updated: hook up Olympus tabs that are already open.
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: OLYMPUS }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["olympus.js"] }).catch(() => {});
    }
  });
});
