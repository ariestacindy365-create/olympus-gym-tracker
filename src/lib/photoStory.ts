// Geometry for "Story foto": a 1080×1920 Story made of 1–4 photos in a
// collage, each photo panned and zoomed inside its box. Client-safe, no DOM.

export const STORY_W = 1080;
export const STORY_H = 1920;
/** Black gap between photos. */
export const STORY_GAP = 8;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Layout = 1 | 2 | 3 | 4;

/** 1 full · 2 top/bottom · 3 one big on top (58%) + two below · 4 a 2×2 grid. */
export function layoutBoxes(layout: Layout): Box[] {
  const W = STORY_W;
  const H = STORY_H;
  const g = STORY_GAP;
  const half = (W - g) / 2;
  if (layout === 1) return [{ x: 0, y: 0, w: W, h: H }];
  if (layout === 2) {
    const h = (H - g) / 2;
    return [
      { x: 0, y: 0, w: W, h },
      { x: 0, y: h + g, w: W, h },
    ];
  }
  if (layout === 3) {
    const top = Math.round(H * 0.58);
    const h = H - top - g;
    return [
      { x: 0, y: 0, w: W, h: top },
      { x: 0, y: top + g, w: half, h },
      { x: half + g, y: top + g, w: half, h },
    ];
  }
  const h = (H - g) / 2;
  return [
    { x: 0, y: 0, w: half, h },
    { x: half + g, y: 0, w: half, h },
    { x: 0, y: h + g, w: half, h },
    { x: half + g, y: h + g, w: half, h },
  ];
}

/** A photo's place in its box: zoom (1 = just covers the box) and how far its centre is moved, in Story pixels. */
export interface Placement {
  zoom: number;
  dx: number;
  dy: number;
}

export const START: Placement = { zoom: 1, dx: 0, dy: 0 };

/** The drawn size of an image covering `box` at `zoom`. */
export function coverSize(img: { width: number; height: number }, box: Box, zoom: number) {
  const s = Math.max(box.w / img.width, box.h / img.height) * zoom;
  return { w: img.width * s, h: img.height * s };
}

/** Keeps the box covered: the photo can't be moved past its own edge. */
export function clampPlacement(img: { width: number; height: number }, box: Box, p: Placement): Placement {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, p.zoom));
  const { w, h } = coverSize(img, box, zoom);
  const mx = Math.max(0, (w - box.w) / 2);
  const my = Math.max(0, (h - box.h) / 2);
  return { zoom, dx: Math.min(mx, Math.max(-mx, p.dx)), dy: Math.min(my, Math.max(-my, p.dy)) };
}

/** Where to draw the image for a box and placement. */
export function imageRect(img: { width: number; height: number }, box: Box, p: Placement): Box {
  const { w, h } = coverSize(img, box, p.zoom);
  return { x: box.x + (box.w - w) / 2 + p.dx, y: box.y + (box.h - h) / 2 + p.dy, w, h };
}

export const inBox = (b: Box, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** The sticker: centre (fractions of the Story) and width (fraction of the Story width). */
export interface StickerPlace {
  cx: number;
  cy: number;
  w: number;
}

export const STICKER_POSITIONS = { Atas: 0.2, Tengah: 0.5, Bawah: 0.8 } as const;
export const MIN_STICKER = 0.35;
export const MAX_STICKER = 1;

export function clampSticker(p: StickerPlace, aspect: number): StickerPlace {
  const w = Math.min(MAX_STICKER, Math.max(MIN_STICKER, p.w));
  const hFrac = (w * STORY_W) / aspect / STORY_H;
  return {
    w,
    cx: Math.min(1 - w / 2, Math.max(w / 2, p.cx)),
    cy: Math.min(1 - hFrac / 2, Math.max(hFrac / 2, p.cy)),
  };
}

/** The sticker's rectangle in Story pixels; `aspect` is its width / height. */
export function stickerRect(p: StickerPlace, aspect: number): Box {
  const w = p.w * STORY_W;
  const h = w / aspect;
  return { x: p.cx * STORY_W - w / 2, y: p.cy * STORY_H - h / 2, w, h };
}
