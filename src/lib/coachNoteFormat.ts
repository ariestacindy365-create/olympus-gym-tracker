// Client-safe pieces of the coach-notes feature (lib/coachNotes reads the DB).

export interface CoachNoteItem {
  id: string;
  body: string;
  context: string | null;
  coachName: string;
  createdAt: string;
  readAt: string | null;
}

export function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    // Same output on the server (UTC) and the member's phone.
    timeZone: "Asia/Jakarta",
  });
}
