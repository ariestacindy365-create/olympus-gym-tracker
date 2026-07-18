export interface ClassSession {
  id: string;
  name: string;
  startMinute: number;
  endMinute: number;
}

export const CLASS_SESSIONS: ClassSession[] = [
  { id: "class-1", name: "07:45-08:45", startMinute: 465, endMinute: 525 },
  { id: "class-2", name: "09:00-10:00", startMinute: 540, endMinute: 600 },
  { id: "class-3", name: "10:30-11:30", startMinute: 630, endMinute: 690 },
  { id: "class-4", name: "16:00-17:00", startMinute: 960, endMinute: 1020 },
  { id: "class-5", name: "17:15-18:15", startMinute: 1035, endMinute: 1095 },
  { id: "class-6", name: "18:30-19:30", startMinute: 1110, endMinute: 1170 },
];

function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getCurrentClassSession(now: Date = new Date()): ClassSession | null {
  const minutes = minuteOfDay(now);
  return CLASS_SESSIONS.find((s) => minutes >= s.startMinute && minutes < s.endMinute) ?? null;
}

export function isWithinSession(date: Date, session: ClassSession): boolean {
  const minutes = minuteOfDay(date);
  return minutes >= session.startMinute && minutes < session.endMinute;
}
