import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@chill-club/ui";
import { formatActivityDate } from "@chill-club/shared";
import type { ParticipantStatus } from "@prisma/client";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { ActivityStatusBadge } from "@/features/activities/components/ActivityStatusBadge";
import { getCopy, getStatusLabel } from "@/lib/copy";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
} from "@/features/activities/utils/activityDisplay";
import type { ProfileParticipationViewModel } from "../queries/getProfileDashboard";

type ProfileParticipationCardProps = {
  participation: ProfileParticipationViewModel;
  locale: string;
};

const participationStatusColors: Record<ParticipantStatus, string> = {
  JOINED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};

export function ProfileParticipationCard({
  participation,
  locale,
}: ProfileParticipationCardProps) {
  const { activity } = participation;
  const t = getCopy(locale);
  const statusLabel =
    t.activityLabels.participationStatuses[participation.status];
  const activityStatus = getActivityDisplayStatus(activity);
  const activityStatusLabel = getStatusLabel(activityStatus, locale);
  const participationDateLabel =
    participation.status === "CANCELLED" && participation.cancelledAt
      ? t.profile.cancelledAt(
          formatActivityDate(participation.cancelledAt, locale),
        )
      : t.profile.signedUpAt(
          formatActivityDate(participation.joinedAt, locale),
        );

  return (
    <Link
      href={withLocale(locale, `/activities/${activity.id}`)}
      aria-label={t.profile.participationAria(
        activity.title,
        statusLabel,
        activityStatusLabel,
      )}
      className="block rounded-lg border border-black/10 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-ink">
            {activity.title}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
            {activity.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Badge
            className={cn(participationStatusColors[participation.status])}
          >
            {statusLabel}
          </Badge>
          <ActivityStatusBadge status={activityStatus} locale={locale} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-zinc-600">
        <span className="font-medium text-zinc-700">
          {participationDateLabel}
        </span>
        <span className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0">
            {getActivityDateLabel(activity, locale)}
          </span>
        </span>
        <span className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0">{getActivityLocationLabel(activity)}</span>
        </span>
      </div>
    </Link>
  );
}
