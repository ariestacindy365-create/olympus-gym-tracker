import { ShareIcon } from "@/components/ui/Icons";

// Replaces the plain "PR" badge on a member's own PR sets so the share card
// can be reopened after the post-save celebration was closed.
export function PRShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buka kartu PR untuk dibagikan"
      className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-95"
    >
      PR
      <ShareIcon />
      <span>Share</span>
    </button>
  );
}
