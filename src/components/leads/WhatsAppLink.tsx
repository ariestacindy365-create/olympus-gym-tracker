"use client";

import { type ReactNode } from "react";
import { toWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppLink({
  waNumber,
  message,
  className = "",
  children,
}: {
  waNumber: string;
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={toWhatsAppLink(waNumber, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38a9.96 9.96 0 0 0 4.79 1.22h.01c5.52 0 10-4.48 10-10s-4.49-9.84-10.01-9.84Zm0 18.15a8.1 8.1 0 0 1-4.14-1.13l-.3-.18-3.11.82.83-3.03-.2-.31a8.13 8.13 0 0 1-1.25-4.32c0-4.49 3.66-8.15 8.16-8.15 4.49 0 8.15 3.65 8.15 8.15 0 4.49-3.65 8.15-8.14 8.15Zm4.47-6.11c-.24-.12-1.45-.72-1.68-.8-.23-.08-.39-.12-.56.12-.16.24-.64.8-.78.97-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
      </svg>
      {children}
    </a>
  );
}
