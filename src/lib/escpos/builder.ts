// Minimal ESC/POS command builder for 58mm thermal receipt printers — no
// dependency, just the handful of commands this app's receipt needs
// (init, align, bold, text, cut). Thermal printers use a single-byte code
// page (commonly CP437), not UTF-8, so anything outside printable ASCII is
// sanitized to a safe substitute rather than risking garbled bytes.
const ESC = 0x1b;
const GS = 0x1d;

// Standard character count per line at normal font size on 58mm paper.
export const LINE_WIDTH = 32;

function sanitizeText(text: string): string {
  return text
    .replace(/[–—]/g, "-") // en/em dash
    .replace(/[‘’]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"') // curly double quotes
    .replace(/ /g, " ") // non-breaking space (e.g. from Intl.NumberFormat)
    .replace(/[^\x20-\x7e\n]/g, "?"); // anything else non-ASCII
}

/** Wraps text to `width` columns, breaking on spaces where possible. */
export function wrapText(text: string, width: number = LINE_WIDTH): string[] {
  const words = sanitizeText(text).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      if (current) lines.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export class EscPosBuilder {
  private bytes: number[] = [];

  init(): this {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  align(mode: "left" | "center" | "right"): this {
    const n = mode === "left" ? 0 : mode === "center" ? 1 : 2;
    this.bytes.push(ESC, 0x61, n);
    return this;
  }

  bold(on: boolean): this {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  text(line: string): this {
    for (const ch of sanitizeText(line)) {
      this.bytes.push(ch.charCodeAt(0));
    }
    return this;
  }

  /** Text followed by a single newline. */
  line(text = ""): this {
    return this.text(text).newline();
  }

  newline(count = 1): this {
    for (let i = 0; i < count; i++) this.bytes.push(0x0a);
    return this;
  }

  divider(): this {
    return this.line("-".repeat(LINE_WIDTH));
  }

  /** A "label ......... value" row, right-aligning value within LINE_WIDTH; wraps if it doesn't fit. */
  row(label: string, value: string): this {
    const l = sanitizeText(label);
    const v = sanitizeText(value);
    const available = LINE_WIDTH - l.length;
    if (available > 1 && v.length <= available - 1) {
      return this.line(l + v.padStart(available));
    }
    this.line(l);
    return this.line(v.length <= LINE_WIDTH ? v.padStart(LINE_WIDTH) : v);
  }

  /** Multi-line paragraph, word-wrapped to the receipt width. */
  paragraph(text: string): this {
    for (const wrapped of wrapText(text)) this.line(wrapped);
    return this;
  }

  /** Feeds a few blank lines and cuts the paper (no-op on printers without a cutter). */
  cut(): this {
    this.newline(3);
    this.bytes.push(GS, 0x56, 0x00);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}
