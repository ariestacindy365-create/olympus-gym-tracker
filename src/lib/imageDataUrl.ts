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
