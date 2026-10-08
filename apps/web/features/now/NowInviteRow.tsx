import Link from "next/link";
import { ArrowUpRight, MapPin, UsersRound } from "lucide-react";
import { RetainedImage } from "@/components/media/RetainedImage";
import { withLocale } from "@/lib/routes";
import {
  NowCountdownOrb,
  NowInlineInterestForm,
  NowLiveCountdown,
  NowStageBadge,
} from "./NowDetailActions";
import {
  getNowCopy,
  getNowIntentWindowLabel,
  getNowKind,
  isNowVisible,
} from "./now";

type NowInviteRowProps = {
  invite: {
    id: string;
    organizerId: string;
    category: string;
    intentWindow: string;
    title: string;
    area: string;
    createdAt: Date;
    expiresAt: Date;
    linkedActivityId?: string | null;
    _count: { interests: number };
    viewerInterested?: boolean;
    interests?: {
      profile: { nickname: string; avatarUrl: string | null };
    }[];
  };
  locale: string;
  viewerId?: string | null;
  showInterestAction?: boolean;
  preview?: boolean;
};

export function NowInviteRow({
  invite,
  locale,
  viewerId,
  showInterestAction = false,
  preview = false,
}: NowInviteRowProps) {
  const copy = getNowCopy(locale);
  const kind = getNowKind(invite.category);
  const active = isNowVisible(invite.expiresAt);
  const href = withLocale(locale, `/now/${invite.id}`);
  const canRaiseHand =
    showInterestAction &&
    active &&
    !invite.linkedActivityId &&
    invite.organizerId !== viewerId;

  return (
    <article className="relative flex min-h-[7.4rem] w-full min-w-0 max-w-full items-center gap-2 border-b border-dashed border-[#D9E7DD] px-1 py-4 last:border-b-0 min-[390px]:gap-3 min-[390px]:px-2">
      <Link
        href={href}
        aria-label={`${invite.title}，${invite._count.interests} ${copy.people}`}
        className="group flex min-w-0 flex-1 items-center gap-2 min-[390px]:gap-3"
      >
        <NowCountdownOrb
          compact
          createdAt={invite.createdAt.toISOString()}
          emoji={kind.emoji}
          expiresAt={invite.expiresAt.toISOString()}
          initialNow={Date.now()}
          locale={locale}
          tone={kind.tone}
        />
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block line-clamp-2 text-[14px] font-bold leading-5 text-[#173D32]">
            {invite.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] leading-4 text-[#60746A]">
            <MapPin size={11} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{invite.area}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">
              {getNowIntentWindowLabel(invite.intentWindow, locale)}
            </span>
            <span className="whitespace-nowrap font-semibold text-[#BA6171]">
              <NowLiveCountdown
                expiresAt={invite.expiresAt.toISOString()}
                initialNow={Date.now()}
                locale={locale}
              />
            </span>
          </span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#24815D]">
            {invite.interests?.length ? (
              <span className="flex -space-x-1.5" aria-hidden="true">
                {invite.interests.slice(0, 3).map(({ profile }, index) => (
                  <span
                    key={`${profile.nickname}-${index}`}
                    className="relative grid h-4 w-4 place-items-center overflow-hidden rounded-full border border-white bg-[#D8F1E2] text-[8px] text-[#246C4C]"
                  >
                    {profile.nickname.charAt(0)}
                    {profile.avatarUrl ? (
                      <RetainedImage
                        src={profile.avatarUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </span>
                ))}
              </span>
            ) : (
              <UsersRound size={12} aria-hidden="true" />
            )}
            <span className="whitespace-nowrap">
              {invite._count.interests}
              <span className="max-[355px]:hidden"> {copy.people}</span>
            </span>
          </span>
          <span className="mt-1.5 block">
            <NowStageBadge
              converted={Boolean(invite.linkedActivityId)}
              expiresAt={invite.expiresAt.toISOString()}
              interestCount={invite._count.interests}
              initialNow={Date.now()}
              locale={locale}
            />
          </span>
        </span>
      </Link>
      {preview && canRaiseHand ? (
        <Link
          href={href}
          className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[#FFD2DA] bg-white px-3 text-[11px] font-bold text-[#D6536B]"
        >
          {copy.interested}
        </Link>
      ) : canRaiseHand ? (
        invite.viewerInterested ? (
          <Link
            href={href}
            className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#FFF0F2] px-3 text-[11px] font-bold text-[#D6536B]"
          >
            {copy.interestedAlready}
          </Link>
        ) : (
          <NowInlineInterestForm inviteId={invite.id} locale={locale} />
        )
      ) : (
        <Link
          href={href}
          aria-label={invite.title}
          className="shrink-0 text-[#468063]"
        >
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
