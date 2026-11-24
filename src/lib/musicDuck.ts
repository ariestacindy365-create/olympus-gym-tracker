// The slideshow's music turns down while a PR is being celebrated
// (fanfare + announcement) and back up after. PRCelebration says when;
// MusicPlayer listens.

const EVENT = "olympus:music-duck";

export function setMusicDucked(on: boolean) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: on }));
}

export function onMusicDuck(cb: (on: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

const TEST_EVENT = "olympus:pr-test";

/** The coach's "Tes pengumuman" button: play a made-up PR on the TV. */
export function requestTestAnnouncement() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TEST_EVENT));
}

export function onTestAnnouncement(cb: () => void): () => void {
  window.addEventListener(TEST_EVENT, cb);
  return () => window.removeEventListener(TEST_EVENT, cb);
}

/** A YouTube link → the video and/or playlist to play; null if it isn't one. */
export function parseYouTube(link: string): { videoId: string | null; listId: string | null } | null {
  let url: URL;
  try {
    url = new URL(link.trim().startsWith("http") ? link.trim() : `https://${link.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const id = (s: string | null | undefined) => (s && /^[\w-]{6,}$/.test(s) ? s : null);
  let videoId: string | null = null;
  if (host === "youtu.be") videoId = id(url.pathname.slice(1).split("/")[0]);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") videoId = id(url.searchParams.get("v"));
    else if (["shorts", "live", "embed"].includes(parts[0])) videoId = id(parts[1]);
  } else return null;
  const listId = id(url.searchParams.get("list"));
  return videoId || listId ? { videoId, listId } : null;
}
