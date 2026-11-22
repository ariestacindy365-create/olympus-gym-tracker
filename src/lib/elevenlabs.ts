import "server-only";

// ElevenLabs text-to-speech for the PR announcement on the class TV.
// Env: ELEVENLABS_API_KEY (from elevenlabs.io → Developers → API Keys),
// optional ELEVENLABS_VOICE_ID (a voice from the Voice Library) and
// ELEVENLABS_MODEL. Without a key the TV keeps using the browser voice.

const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL = "eleven_multilingual_v2";

export const elevenLabsEnabled = () => !!process.env.ELEVENLABS_API_KEY?.trim();

/** The announcement as MP3, or null when ElevenLabs refused or is unreachable. */
export async function speakText(text: string): Promise<ArrayBuffer | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return null;
  const base = process.env.ELEVENLABS_BASE_URL?.trim() || "https://api.elevenlabs.io";
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE;
  try {
    const res = await fetch(`${base}/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_MODEL,
        language_code: "id",
        // Lively, like an announcer.
        voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.error("ElevenLabs refused", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    return await res.arrayBuffer();
  } catch (error) {
    console.error("ElevenLabs unreachable", error);
    return null;
  }
}
