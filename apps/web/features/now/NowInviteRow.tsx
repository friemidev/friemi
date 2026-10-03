import Link from "next/link";
import { ArrowUpRight, MapPin, UsersRound } from "lucide-react";
import { RetainedImage } from "@/components/media/RetainedImage";
import { withLocale } from "@/lib/routes";
import {
  NowCountdownOrb,
  NowInlineInterestForm,
  NowLiveCountdown,
} from "./NowDetailActions";
import { getNowCopy, getNowKind, isNowVisible } from "./now";

type NowInviteRowProps = {
  invite: {
    id: string;
    organizerId: string;
    category: string;
    title: string;
    area: string;
    createdAt: Date;
    expiresAt: Date;
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
    showInterestAction && active && invite.organizerId !== viewerId;

  return (
    <article className="flex min-h-[7.4rem] w-full min-w-0 max-w-full items-center gap-2 rounded-[1.4rem] border border-[#E7EEE8] bg-white px-2.5 py-3 shadow-[0_7px_22px_rgba(19,75,50,.055)] min-[390px]:gap-3 min-[390px]:px-3">
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
          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#60746A]">
            <MapPin size={11} aria-hidden="true" />
            {invite.area}
            <span aria-hidden="true">·</span>
            <NowLiveCountdown
              expiresAt={invite.expiresAt.toISOString()}
              initialNow={Date.now()}
              locale={locale}
            />
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
