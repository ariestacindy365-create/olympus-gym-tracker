// Pre-filled WhatsApp messages sourced from SalesScript_Olympus_2026_v1.pdf
// (internal Olympus sales script, v1.0 Mar 2026). Keep wording close to the
// original script — admin can still edit before sending.

// Langkah 2 — Tanya Preferensi. Sent once a captured lead is still at the DM
// stage; Langkah 1 (asking their name) is skipped since capture already has it.
export function waOpeningMessage(name: string): string {
  return `Salam kenal, Kak ${name}!\nLebih tertarik latihan bareng grup atau private bareng pelatih?`;
}

// Langkah 5 (H+1) / Langkah 6 opening line (H+3) — check-in messages sent
// after a lead has been marked TRIAL, timed off trialMarkedAt.
export function waFollowUpMessage(name: string, type: "H1" | "H3"): string {
  if (type === "H1") {
    return `Halo Kak ${name}, gimana kondisinya setelah latihan kemarin? 🙂`;
  }
  return `Halo Kak ${name}, gimana sesi latihannya sejauh ini? 🙂`;
}
