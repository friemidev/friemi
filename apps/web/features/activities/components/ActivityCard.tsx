import Link from "next/link";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@chill-club/ui";
import { activityCategories, formatActivityDate } from "@chill-club/shared";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
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
  return (
    <Link href={withLocale(locale, `/activities/${activity.id}`)}>
      <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className={cn("h-28", coverTones[activity.coverTone])} />
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-500">{activityCategories[activity.category]}</span>
            <ActivityStatusBadge status={activity.status} />
          </div>
          <CardTitle>{activity.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="line-clamp-2 text-sm leading-6 text-zinc-600">{activity.description}</p>
          <div className="grid gap-2 text-sm text-zinc-600">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatActivityDate(activity.startAt, locale)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {activity.address}
            </span>
            <span className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              {activity.participantCount}/{activity.capacity} 人 · {activity.priceText}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
