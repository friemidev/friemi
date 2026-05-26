import Link from "next/link";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@chill-club/ui";
import { activityCategories } from "@chill-club/shared";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
  getActivityParticipantPercent,
  getActivitySeatLabel
} from "../utils/activityDisplay";
import { ActivityStatusBadge } from "./ActivityStatusBadge";

type ActivityCardProps = {
  activity: ActivityCardViewModel;
  locale: string;
};

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  moss: "bg-moss",
  clay: "bg-clay",
  sky: "bg-sky"
};

export function ActivityCard({ activity, locale }: ActivityCardProps) {
  const participantPercent = getActivityParticipantPercent(activity);
  const displayStatus = getActivityDisplayStatus(activity);
  const activityLabel = `${activity.title}，${getActivityDateLabel(activity, locale)}，${getActivityLocationLabel(activity)}`;

  return (
    <Link href={withLocale(locale, `/activities/${activity.id}`)} aria-label={activityLabel}>
      <Card className="flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className={cn("flex h-28 items-end justify-between p-4", coverTones[activity.coverTone])}>
          <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink">
            {activityCategories[activity.category]}
          </span>
          <ActivityStatusBadge status={displayStatus} />
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-2">{activity.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-4">
          <p className="line-clamp-2 text-sm leading-6 text-zinc-600">{activity.description}</p>
          <div className="grid gap-2 text-sm text-zinc-600">
            <span className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">{getActivityDateLabel(activity, locale)}</span>
            </span>
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">{getActivityLocationLabel(activity)}</span>
            </span>
          </div>
          <div className="mt-auto space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3 text-sm text-zinc-600">
              <span className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 shrink-0" />
                {activity.participantCount}/{activity.capacity} 人
              </span>
              <span className="shrink-0 font-medium text-ink">{getActivitySeatLabel(activity)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-moss" style={{ width: `${participantPercent}%` }} />
            </div>
            <p className="text-sm font-medium text-ink">{activity.priceText}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
