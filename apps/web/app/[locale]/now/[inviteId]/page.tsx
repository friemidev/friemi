import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin, UsersRound } from "lucide-react";
import { MessageAvatar } from "@/features/direct-messages/components/MessageAvatar";
import {
  NowInterestForm,
  NowLiveCountdown,
  NowMessageForm,
} from "@/features/now/NowDetailActions";
import { getNowCopy, getNowKind, isNowVisible } from "@/features/now/now";
import { selectNowInterestAction } from "@/features/now/actions";
import { getNowInviteDetail } from "@/features/now/queries";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string; inviteId: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { locale, inviteId } = await params;
  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, `/now/${inviteId}`),
  });
}

export default async function NowInvitePage({ params }: PageProps) {
  const { locale, inviteId } = await params;
  const viewer = await getOptionalCurrentUserProfileSnapshot();
  const invite = await getNowInviteDetail(inviteId, viewer?.id);
  if (!invite) notFound();
  const copy = getNowCopy(locale);
  const kind = getNowKind(invite.category);
  const active = isNowVisible(invite.expiresAt);
  const canTalk = invite.isOrganizer || invite.isInterested;
  const viewerSelection = invite.interests.find(
    (interest) => interest.profileId === viewer?.id,
  )?.selectedAt;
  const initialNow = Date.now();

  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#FBFCFA] px-5 pb-28 pt-5 text-[#173D32]">
      <div className="mx-auto max-w-[620px]">
        <div className="flex items-center justify-between">
          <Link
            href={withLocale(locale, "/mobile-home")}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <Link
            href={withLocale(locale, "/now/mine")}
            className="inline-flex min-h-11 items-center text-[13px] font-semibold text-[#1E7353]"
          >
            {copy.mine}
          </Link>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[1.8rem] bg-white px-5 pb-6 pt-8 text-center shadow-[0_12px_34px_rgba(29,80,48,.07)]">
          <div
            className="pointer-events-none absolute left-1/2 top-2 h-[14rem] w-[14rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#F1F9F0,transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid h-[9rem] w-[9rem] place-items-center rounded-full bg-[conic-gradient(#F46F82_0_78%,#FBE4E8_78%_100%)] p-[9px] shadow-[0_18px_38px_rgba(244,111,130,.16)]">
            <div
              className="grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff,#FFF1F3_65%,#FBE0E5)] text-[3.5rem]"
              aria-hidden="true"
            >
              {kind.emoji}
            </div>
          </div>
          <p className="relative mt-4 text-[13px] font-bold text-[#EC667B]">
            <NowLiveCountdown
              expiresAt={invite.expiresAt.toISOString()}
              initialNow={initialNow}
              locale={locale}
            />
          </p>
          <h1 className="relative mt-3 text-[23px] font-bold leading-8">
            {invite.title}
          </h1>
          <p className="relative mt-2 flex items-center justify-center gap-1.5 text-[13px] text-[#5E786A]">
            <MapPin size={15} aria-hidden="true" />
            {invite.area} · {invite.city}
          </p>
          {invite.note ? (
            <p className="relative mt-4 rounded-2xl bg-[#F7FAF6] px-4 py-3 text-left text-[14px] leading-6 text-[#4D6759]">
              {invite.note}
            </p>
          ) : null}
          <div className="relative mt-5 flex items-center justify-center gap-2 border-t border-[#EFF2EC] pt-4">
            <MessageAvatar
              avatarUrl={invite.organizer.avatarUrl}
              name={invite.organizer.nickname}
              size="sm"
            />
            <span className="text-[13px] font-semibold">
              {invite.organizer.nickname}
            </span>
            <span className="text-[12px] text-[#8A9B8C]">·</span>
            <UsersRound
              size={15}
              className="text-[#1F7654]"
              aria-hidden="true"
            />
            <span className="text-[12px] text-[#557263]">
              {invite.interests.length} {copy.people}
            </span>
          </div>
        </div>

        {!invite.isOrganizer && active ? (
          <NowInterestForm
            inviteId={invite.id}
            isInterested={invite.isInterested}
            locale={locale}
          />
        ) : null}

        {invite.interests.length ? (
          <section className="mt-7">
            <h2 className="mb-3 text-[16px] font-bold">{copy.people}</h2>
            <div className="grid gap-2.5">
              {invite.interests.map((interest) => (
                <div
                  key={interest.profileId}
                  className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm"
                >
                  <MessageAvatar
                    avatarUrl={interest.profile.avatarUrl}
                    name={interest.profile.nickname}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold">
                      {interest.profile.nickname}
                    </p>
                    {interest.note ? (
                      <p className="mt-0.5 text-[12px] text-[#6A7D70]">
                        {interest.note}
                      </p>
                    ) : null}
                  </div>
                  {invite.isOrganizer && !invite.linkedActivity ? (
                    <form action={selectNowInterestAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <input
                        type="hidden"
                        name="profileId"
                        value={interest.profileId}
                      />
                      <input
                        type="hidden"
                        name="selected"
                        value={interest.selectedAt ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className={`min-h-11 rounded-xl px-3 text-[12px] font-bold ${interest.selectedAt ? "bg-[#E9F7EE] text-[#126A4A]" : "bg-[#F5F7F3] text-[#537364]"}`}
                      >
                        {interest.selectedAt
                          ? locale === "zh-CN"
                            ? "已选择"
                            : locale === "fr"
                              ? "Choisi·e"
                              : "Selected"
                          : locale === "zh-CN"
                            ? "选入组局"
                            : locale === "fr"
                              ? "Choisir"
                              : "Select"}
                      </button>
                    </form>
                  ) : interest.selectedAt ? (
                    <span className="rounded-lg bg-[#E9F7EE] px-2 py-1 text-[11px] font-semibold text-[#126A4A]">
                      {locale === "zh-CN"
                        ? "已选择"
                        : locale === "fr"
                          ? "Choisi·e"
                          : "Selected"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {invite.isOrganizer ? (
          <section className="mt-7 rounded-[1.4rem] bg-[#EAF7EE] px-4 py-4">
            <h2 className="text-[15px] font-bold">{copy.organize}</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#53705D]">
              {locale === "zh-CN"
                ? "有了同伴，就把时间、地点和人数确定下来。"
                : locale === "fr"
                  ? "Choisissez un horaire et un lieu pour réunir le groupe."
                  : "Set a time and place to make the plan real."}
            </p>
            {invite.interests.some((interest) => interest.selectedAt) ? (
              <p className="mt-2 text-[12px] font-semibold text-[#126A4A]">
                {locale === "zh-CN"
                  ? `已选择 ${invite.interests.filter((interest) => interest.selectedAt).length} 人；对方仍需正式报名聚吧。`
                  : locale === "fr"
                    ? `${invite.interests.filter((interest) => interest.selectedAt).length} personnes choisies · chacune devra confirmer sa place.`
                    : `${invite.interests.filter((interest) => interest.selectedAt).length} selected · each person still confirms their place.`}
              </p>
            ) : null}
            {invite.linkedActivity ? (
              <Link
                href={withLocale(locale, `/lobby/${invite.linkedActivity.id}`)}
                className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl bg-white px-4 text-[13px] font-bold text-[#126A4A]"
              >
                {invite.linkedActivity.title}
                <ArrowUpRight size={15} />
              </Link>
            ) : (
              <Link
                href={withLocale(
                  locale,
                  `/activities/new?mode=form&fromNow=${encodeURIComponent(invite.id)}`,
                )}
                className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#126A4A] px-4 text-[13px] font-bold text-white"
              >
                {copy.organize}
                <ArrowUpRight size={15} />
              </Link>
            )}
          </section>
        ) : null}

        {!invite.isOrganizer && viewerSelection ? (
          <section className="mt-7 rounded-[1.4rem] bg-[#EAF7EE] px-4 py-4">
            <p className="text-[14px] font-bold text-[#126A4A]">
              {locale === "zh-CN"
                ? "发起者选中了你"
                : locale === "fr"
                  ? "L'organisateur vous a choisi·e"
                  : "The host selected you"}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#587263]">
              {locale === "zh-CN"
                ? "这只是组局邀请意向，正式参加请到聚吧页面报名。"
                : "Confirm your place on the hangout page when it is ready."}
            </p>
            {invite.linkedActivity ? (
              <Link
                href={withLocale(locale, `/lobby/${invite.linkedActivity.id}`)}
                className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#126A4A] px-4 text-[13px] font-bold text-white"
              >
                {invite.linkedActivity.title}
                <ArrowUpRight size={15} />
              </Link>
            ) : null}
          </section>
        ) : null}

        {canTalk ? (
          <section className="mt-7">
            <h2 className="text-[16px] font-bold">{copy.discussion}</h2>
            <div className="mt-3 grid gap-3">
              {invite.messages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-2.5 rounded-2xl bg-white px-3 py-3 shadow-sm"
                >
                  <MessageAvatar
                    avatarUrl={message.author.avatarUrl}
                    name={message.author.nickname}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold">
                      {message.author.nickname}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#52685A]">
                      {message.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <NowMessageForm inviteId={invite.id} locale={locale} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
