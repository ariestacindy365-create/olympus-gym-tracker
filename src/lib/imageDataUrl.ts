"use client";

// html-to-image fetches and re-embeds <img> sources itself when exporting a
// node to PNG/SVG, and that internal fetch step is unreliable on iOS Safari
// (WebKit silently drops the image instead of embedding it — no error, the
// export just comes out missing it). Pre-converting the src to a data: URI
// ourselves means there's nothing left for html-to-image to fetch, so the
// image is guaranteed to already be part of the DOM it captures.
export async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// Belt-and-suspenders for the html-to-image logo bug above: even with the
// src pre-converted to a data: URI, Safari's SVG-foreignObject rasterizer
// has separately been seen to just skip <img> elements when flattening the
// captured node to a canvas. So after toPng() produces the card, stamp the
// already-loaded logo image on top ourselves with plain canvas drawImage —
// that draw call never goes through foreignObject, so it can't hit the same
// bug. If html-to-image DID render the logo, this just redraws it in the
// same spot with no visible difference.
export async function compositeLogoOntoDataUrl(
  cardDataUrl: string,
  cardEl: HTMLElement,
  logoEl: HTMLImageElement
): Promise<string> {
  const cardImg = await loadImage(cardDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = cardImg.naturalWidth;
  canvas.height = cardImg.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return cardDataUrl;
  ctx.drawImage(cardImg, 0, 0);

  const cardRect = cardEl.getBoundingClientRect();
  const logoRect = logoEl.getBoundingClientRect();
  if (cardRect.width === 0 || cardRect.height === 0) return cardDataUrl;

  const scaleX = canvas.width / cardRect.width;
  const scaleY = canvas.height / cardRect.height;
  const x = (logoRect.left - cardRect.left) * scaleX;
  const y = (logoRect.top - cardRect.top) * scaleY;
  const w = logoRect.width * scaleX;
  const h = logoRect.height * scaleY;
  ctx.drawImage(logoEl, x, y, w, h);

  return canvas.toDataURL("image/png");
}
