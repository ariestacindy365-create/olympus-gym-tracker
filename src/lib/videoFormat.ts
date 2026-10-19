// Recording format for shared story videos. H.264-in-MP4 first and asked
// for explicitly: WhatsApp rejects anything else ("format not supported"),
// and a bare "video/mp4" lets some browsers put VP9 inside the MP4, which
// WhatsApp also refuses. WebM is only a last resort for browsers with no
// MP4 recording at all (Android's share sheet rejects WebM too).
const PREFERRED_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1.4D401F",
  "video/mp4;codecs=avc1.640028",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm",
];

export function pickVideoMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}
