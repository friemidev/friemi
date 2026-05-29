import { Badge } from "@chill-club/ui";
import { type ActivityStatus } from "@chill-club/shared";
import { getStatusLabel } from "@/lib/copy";
import { cn } from "@/lib/utils";

type ActivityStatusBadgeProps = {
  status: ActivityStatus;
  locale?: string;
};

const colors: Record<ActivityStatus, string> = {
  OPEN: "bg-emerald-100 text-emerald-800",
  FULL: "bg-amber-100 text-amber-800",
  DRAFT: "bg-zinc-100 text-zinc-700",
  RECRUITING: "bg-emerald-100 text-emerald-800",
  CONFIRMED: "bg-sky-100 text-sky-800",
  ENDED: "bg-zinc-200 text-zinc-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export function ActivityStatusBadge({
  status,
  locale = "zh-CN",
}: ActivityStatusBadgeProps) {
  return (
    <Badge className={cn(colors[status])}>
      {getStatusLabel(status, locale)}
    </Badge>
  );
}
