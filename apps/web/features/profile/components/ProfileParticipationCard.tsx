import { CalendarDays, MapPin } from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import type { ParticipantStatus } from "@prisma/client";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import type { DetailSourceInput } from "@/features/navigation/contextualDetailReturn";
import { getCopy, getStatusLabel } from "@/lib/copy";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
} from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import type { ProfileParticipationViewModel } from "../queries/getProfileDashboard";

type ProfileParticipationCardProps = {
  detailSourceState?: DetailSourceInput["sourceState"];
  participation: ProfileParticipationViewModel;
  locale: string;
};

const participationStatusColors: Record<ParticipantStatus, string> = {
  JOINED: "bg-[#DDF8E7] text-[#156240]",
  PENDING: "bg-[#FFF2D7] text-[#8A641A]",
  APPROVED: "bg-[#DDF8E7] text-[#156240]",
  REJECTED: "bg-[#FFE2E2] text-[#9A2135]",
  CANCELLED: "bg-[#ECEDE7] text-[#6C746A]",
};

export function ProfileParticipationCard({
  detailSourceState,
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
    <ContextualDetailLink
      href={withLocale(locale, getActivityDetailPath(activity.id))}
      detailSource={{
        sourceKey: "profile",
        sourceState: detailSourceState ?? {
          section: "participation",
        },
        targetKey: `activity:${activity.id}`,
        targetKind: "activity",
      }}
      data-detail-source-target={`activity:${activity.id}`}
      aria-label={t.profile.participationAria(
        activity.title,
        statusLabel,
        activityStatusLabel,
      )}
      className="block rounded-[1.05rem] border border-[#E3DCC5] bg-white px-4 py-5 shadow-[0_10px_24px_rgba(21,98,64,0.04)] transition active:scale-[0.99] sm:p-5 md:hover:-translate-y-0.5 md:hover:shadow-md"
    >
      <div className="grid gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[16px] font-black leading-6 text-[#111210] sm:text-lg">
            {activity.title}
          </p>
          <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-6 text-[#6C746A]">
            {activity.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-[12px] font-black",
              participationStatusColors[participation.status],
            )}
          >
            {statusLabel}
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-[#F1F2EC] px-3 text-[12px] font-black text-[#4F574F]">
            {activityStatusLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 text-[14px] font-semibold leading-5 text-[#4F574F]">
        <span className="font-black text-[#1D1D1B]/82">
          {participationDateLabel}
        </span>
        <span className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#6C746A]" />
          <span className="min-w-0">
            {getActivityDateLabel(activity, locale)}
          </span>
        </span>
        <span className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6C746A]" />
          <span className="min-w-0">{getActivityLocationLabel(activity)}</span>
        </span>
      </div>
    </ContextualDetailLink>
  );
}
