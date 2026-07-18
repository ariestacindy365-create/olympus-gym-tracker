export interface PREvent {
  id: string;
  memberName: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  createdAt: string;
}

export function PRToast({ event, onDismiss }: { event: PREvent; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-accent bg-surface px-4 py-3 shadow-lg">
      <span className="text-2xl">🏆</span>
      <div>
        <p className="text-sm font-semibold text-accent">New PR!</p>
        <p className="text-sm">
          {event.memberName} - {event.exerciseName}: {event.weight}kg x {event.reps}
        </p>
      </div>
      <button onClick={onDismiss} className="ml-2 text-muted hover:text-foreground cursor-pointer">
        ✕
      </button>
    </div>
  );
}
