import { Badge } from "@/components/ui/Badge";

interface MemberStatusBadgeProps {
  online: boolean;
  loggedToday: boolean;
}

export function MemberStatusBadge({ online, loggedToday }: MemberStatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge tone={online ? "success" : "muted"}>
        <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-success" : "bg-muted"}`} />
        {online ? "Online" : "Offline"}
      </Badge>
      <Badge tone={loggedToday ? "accent" : "muted"}>
        {loggedToday ? "Sudah catat" : "Belum catat"}
      </Badge>
    </div>
  );
}
