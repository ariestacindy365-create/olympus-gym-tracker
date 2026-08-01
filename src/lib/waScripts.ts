// Pre-filled WhatsApp messages sourced from SalesScript_Olympus_2026_v1.pdf
// (internal Olympus sales script, v1.0 Mar 2026). Keep wording close to the
// original script — admin can still edit before sending.
//
// No emoji anywhere here — confirmed broken (shows as a corrupted
// character) through wa.me's text= param across multiple emoji, on both
// WhatsApp Web and iOS. Plain text has always come through intact.

// Langkah 2 — Tanya Preferensi. Sent once a captured lead is still at the DM
// stage; Langkah 1 (asking their name) is skipped since capture already has it.
export function waOpeningMessage(name: string): string {
  return `Salam kenal, Kak ${name}!\nLebih tertarik latihan bareng grup atau private bareng pelatih?`;
}

// H1/H3 = trial check-ins (Langkah 5 / Langkah 6 opening line), timed off
// trialMarkedAt. H7/H21 = post-conversion check-ins, timed off convertedAt:
// H+7 asks how it's going and asks for a Google review; H+21 (3 weeks) asks
// how it's going and gives a heads-up their membership is about to run out.
// CUSTOM = admin-scheduled for an arbitrary date the lead asked for — no
// fixed script since the reason varies, just a neutral opener to edit.
export function waFollowUpMessage(name: string, type: "H1" | "H3" | "H7" | "H21" | "CUSTOM"): string {
  switch (type) {
    case "H1":
      return `Halo Kak ${name}, gimana kondisinya setelah latihan kemarin?`;
    case "H3":
      return `Halo Kak ${name}, gimana sesi latihannya sejauh ini?`;
    case "H7": {
      const reviewLink = process.env.GOOGLE_REVIEW_LINK;
      const reviewLine = reviewLink
        ? `\n\nKalau berkenan, boleh banget bantu kasih review pengalamannya di sini ya: ${reviewLink}`
        : "";
      return `Halo Kak ${name}, gimana kabarnya setelah seminggu jadi member Olympus? Semoga makin semangat latihannya!${reviewLine}`;
    }
    case "H21":
      return `Halo Kak ${name}, gimana kabar latihannya? Mau info aja nih, membership Kakak bakal segera berakhir — kalau mau lanjut, kabari kami ya biar dibantu perpanjang.`;
    case "CUSTOM":
      return `Halo Kak ${name}, mau follow up lagi nih sesuai yang kita janjikan kemarin.`;
  }
}
