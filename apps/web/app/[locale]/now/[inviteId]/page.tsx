import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  MessageCircle,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { MessageAvatar } from "@/features/direct-messages/components/MessageAvatar";
import { StartDirectConversationButton } from "@/features/direct-messages/components/StartDirectConversationButton";
import {
  NowCountdownOrb,
  NowInterestForm,
  NowMessageForm,
  NowStageBadge,
} from "@/features/now/NowDetailActions";
import {
  getNowCopy,
  getNowIntentWindowLabel,
  getNowKind,
  isNowVisible,
} from "@/features/now/now";
import { selectNowInterestAction } from "@/features/now/actions";
import { getNowInviteDetail } from "@/features/now/queries";
import { getNowPreviewDetail } from "@/features/now/nowPreview";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ locale: string; inviteId: string }>;
  searchParams?: Promise<{ as?: string; justPublished?: string }>;
};
export const dynamic = "force-dynamic";

function interestAgeLabel(createdAt: Date, now: number, locale: string) {
  const minutes = Math.max(1, Math.floor((now - createdAt.getTime()) / 60_000));
  if (minutes < 60)
    return locale === "zh-CN"
      ? `${minutes} 分钟前`
      : locale === "fr"
        ? `il y a ${minutes} min`
        : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return locale === "zh-CN"
    ? `${hours} 小时前`
    : locale === "fr"
      ? `il y a ${hours} h`
      : `${hours}h ago`;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, inviteId } = await params;
  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, `/now/${inviteId}`),
  });
}

export default async function NowInvitePage({
  params,
  searchParams,
}: PageProps) {
  const { locale, inviteId } = await params;
  const query = (await searchParams) ?? {};
  const preview =
    process.env.NODE_ENV === "development" && inviteId.startsWith("preview-");
  const previewRole =
    query.as === "host" || query.as === "interested" ? query.as : "viewer";
  const viewer = preview ? null : await getOptionalCurrentUserProfileSnapshot();
  const initialNow = Date.now();
  const invite = preview
    ? getNowPreviewDetail(inviteId, initialNow, previewRole)
    : await getNowInviteDetail(inviteId, viewer?.id);
  if (!invite) notFound();
  const copy = getNowCopy(locale);
  const kind = getNowKind(invite.category);
  const active = isNowVisible(invite.expiresAt);
  const canTalk = invite.isOrganizer || invite.isInterested;
  const viewerId =
    preview && previewRole === "interested" ? "preview-viewer" : viewer?.id;
  const viewerSelection = invite.interests.find(
    (interest) => interest.profileId === viewerId,
  )?.selectedAt;

  return (
    <main className="now-flow-page app-mobile-page-shell min-h-svh bg-[#FBFCFA] px-5 pb-28 pt-5 text-[#173D32]">
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

        {preview ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#678573]">
            <span>开发预览 · 示例内容</span>
            {(["viewer", "interested", "host"] as const).map((role) => (
              <Link
                key={role}
                href={withLocale(
                  locale,
                  `/now/${invite.id}${role === "viewer" ? "" : `?as=${role}`}`,
                )}
                className={`rounded-full px-2.5 py-1 ${previewRole === role ? "bg-[#E7F6EC] text-[#126A4A]" : "bg-white text-[#6D8173]"}`}
              >
                {role === "host"
                  ? "发起者"
                  : role === "interested"
                    ? "已举手"
                    : "参与者"}
              </Link>
            ))}
          </div>
        ) : null}

        {query.justPublished === "1" &&
        invite.isOrganizer &&
        (preview || initialNow - invite.createdAt.getTime() < 5 * 60_000) ? (
          <section
            className="mt-3 rounded-[1.4rem] border border-[#CDECD8] bg-[linear-gradient(120deg,#ECF9EF,#FFF6F2)] px-4 py-3 shadow-[0_10px_25px_rgba(39,117,76,.08)]"
            role="status"
          >
            <p className="text-[15px] font-bold text-[#126A4A]">
              ✨{" "}
              {locale === "zh-CN"
                ? "你的此刻已发布"
                : locale === "fr"
                  ? "Votre envie est en ligne"
                  : "Your NOW is live"}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#567261]">
              {locale === "zh-CN"
                ? `${invite.interests.length} 人感兴趣 · 等待同频的人出现。`
                : locale === "fr"
                  ? `${invite.interests.length} personnes intéressées · En attente de rencontres.`
                  : `${invite.interests.length} interested · Waiting for people who feel the same.`}
            </p>
          </section>
        ) : null}

        <div className="relative mt-2 overflow-hidden rounded-[1.8rem] bg-white px-5 pb-4 pt-3 text-center shadow-[0_12px_34px_rgba(29,80,48,.07)]">
          <div
            className="pointer-events-none absolute left-1/2 top-2 h-[14rem] w-[14rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#F1F9F0,transparent_70%)]"
            aria-hidden="true"
          />
          <NowCountdownOrb
            createdAt={invite.createdAt.toISOString()}
            emoji={kind.emoji}
            expiresAt={invite.expiresAt.toISOString()}
            initialNow={initialNow}
            locale={locale}
            tone={kind.tone}
          />
          <div className="relative mt-1">
            <NowStageBadge
              expiresAt={invite.expiresAt.toISOString()}
              interestCount={invite.interests.length}
              initialNow={initialNow}
              locale={locale}
            />
          </div>
          <h1 className="relative mt-2 text-[23px] font-bold leading-8">
            {invite.title}
          </h1>
          <p className="relative mt-2 flex items-center justify-center gap-1.5 text-[13px] text-[#5E786A]">
            <MapPin size={15} aria-hidden="true" />
            {invite.area} ·{" "}
            {getNowIntentWindowLabel(invite.intentWindow, locale)}
          </p>
          {invite.note ? (
            <p className="relative mt-3 rounded-2xl bg-[#F7FAF6] px-4 py-3 text-left text-[14px] leading-6 text-[#4D6759]">
              {invite.note}
            </p>
          ) : null}
          <div className="relative mt-4 flex items-center justify-center gap-2 border-t border-[#EFF2EC] pt-3">
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

        {!invite.isOrganizer && (active || invite.isInterested) ? (
          preview ? (
            <div className="mt-3">
              {!invite.isInterested ? (
                <input
                  disabled
                  placeholder="留一句话（选填）"
                  className="mb-3 min-h-11 w-full rounded-xl border border-[#DDE9E0] bg-white px-3 text-[13px]"
                />
              ) : null}
              <button
                type="button"
                disabled
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F66F81] text-[15px] font-bold text-white opacity-75"
              >
                {invite.isInterested ? copy.interestedAlready : copy.interested}
              </button>
            </div>
          ) : (
            <NowInterestForm
              expiresAt={invite.expiresAt.toISOString()}
              initialNow={initialNow}
              inviteId={invite.id}
              isInterested={invite.isInterested}
              locale={locale}
            />
          )
        ) : null}

        {invite.isInterested && !invite.isOrganizer ? (
          <section className="mt-4 rounded-[1.5rem] border border-[#CDEBD6] bg-[linear-gradient(125deg,#ECF9EF,#FFF4F5)] px-4 py-4 shadow-[0_12px_28px_rgba(37,112,68,.08)]">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#157250]">
              <Sparkles size={15} aria-hidden="true" />
              {locale === "zh-CN"
                ? `你和 ${invite.organizer.nickname} 同频了`
                : locale === "fr"
                  ? `Vous et ${invite.organizer.nickname} avez la même envie`
                  : `You and ${invite.organizer.nickname} want the same thing`}
            </p>
            <p className="mt-1.5 text-[12px] leading-5 text-[#587361]">
              {locale === "zh-CN"
                ? "聊聊具体时间和地点，再决定要不要一起。"
                : locale === "fr"
                  ? "Parlez de l'heure et du lieu avant de vous décider."
                  : "Chat about the time and place, then decide together."}
            </p>
            {preview ? (
              <span className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#126A4A] px-4 text-[12px] font-bold text-white opacity-65">
                <MessageCircle size={15} />
                {locale === "zh-CN" ? "聊聊 · 预览" : "Chat · preview"}
              </span>
            ) : (
              <StartDirectConversationButton
                className="mt-3"
                buttonClassName="min-h-10 bg-[#126A4A] text-[12px]"
                label={
                  locale === "zh-CN"
                    ? "和发起者聊聊"
                    : locale === "fr"
                      ? "Discuter"
                      : "Chat with the host"
                }
                locale={locale}
                nowInviteId={invite.id}
                peerProfileId={invite.organizer.id}
                redirectPath={`/now/${invite.id}`}
              />
            )}
          </section>
        ) : null}

        {invite.interests.length ? (
          <section className="mt-7">
            <h2 className="mb-3 text-[16px] font-bold">
              {locale === "zh-CN"
                ? "举手的人"
                : locale === "fr"
                  ? "Personnes intéressées"
                  : "People interested"}
            </h2>
            <div className="grid gap-2.5">
              {invite.interests.map((interest) => (
                <div
                  key={interest.profileId}
                  className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm max-[359px]:flex-wrap max-[359px]:gap-y-2"
                >
                  <MessageAvatar
                    avatarUrl={interest.profile.avatarUrl}
                    name={interest.profile.nickname}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 max-[359px]:min-w-[calc(100%-3.25rem)]">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold">
                        {interest.profile.nickname}
                      </p>
                      <span className="whitespace-nowrap text-[10px] text-[#9AA99C]">
                        {interestAgeLabel(
                          interest.createdAt,
                          initialNow,
                          locale,
                        )}
                      </span>
                    </div>
                    {interest.note ? (
                      <p className="mt-0.5 text-[12px] text-[#6A7D70]">
                        {interest.note}
                      </p>
                    ) : null}
                  </div>
                  {invite.isOrganizer ? (
                    preview ? (
                      <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-[#EFF8F0] px-2.5 text-[11px] font-bold text-[#126A4A] opacity-65 max-[359px]:ml-auto">
                        <MessageCircle size={13} />
                        聊聊
                      </span>
                    ) : (
                      <StartDirectConversationButton
                        className="max-[359px]:ml-auto"
                        buttonClassName="min-h-10 px-2.5 text-[11px]"
                        hideIcon
                        label={
                          locale === "zh-CN"
                            ? "聊聊"
                            : locale === "fr"
                              ? "Discuter"
                              : "Chat"
                        }
                        locale={locale}
                        nowInviteId={invite.id}
                        peerProfileId={interest.profileId}
                        redirectPath={`/now/${invite.id}`}
                      />
                    )
                  ) : null}
                  {preview && invite.isOrganizer ? (
                    <span className="rounded-xl bg-[#E9F7EE] px-3 py-2 text-[12px] font-bold text-[#126A4A]">
                      {interest.selectedAt ? "已选择" : "选入组局"}
                    </span>
                  ) : invite.isOrganizer && !invite.linkedActivity ? (
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
            <h2 className="text-[15px] font-bold">
              {invite.interests.length >= 5
                ? locale === "zh-CN"
                  ? `${invite.interests.length} 人同频了，变成聚吧？`
                  : locale === "fr"
                    ? `${invite.interests.length} personnes intéressées · Une sortie ?`
                    : `${invite.interests.length} interested · Make it a hangout?`
                : copy.organize}
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-[#53705D]">
              {locale === "zh-CN"
                ? "把同频的人聚在一起：确认具体时间和地点，再正式发布。"
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
            ) : preview ? (
              <Link
                href={withLocale(locale, `/now/${invite.id}/convert`)}
                className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#126A4A] px-4 text-[13px] font-bold text-white opacity-75"
              >
                {invite.interests.length >= 5
                  ? locale === "zh-CN"
                    ? "一起聚聚"
                    : locale === "fr"
                      ? "Organiser"
                      : "Make a hangout"
                  : copy.organize}
                <ArrowUpRight size={15} />
              </Link>
            ) : (
              <Link
                href={withLocale(locale, `/now/${invite.id}/convert`)}
                className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#126A4A] px-4 text-[13px] font-bold text-white"
              >
                {invite.interests.length >= 5
                  ? locale === "zh-CN"
                    ? "一起聚聚"
                    : locale === "fr"
                      ? "Organiser"
                      : "Make a hangout"
                  : copy.organize}
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
            <p className="mt-1 text-[11px] text-[#7B8C7F]">
              {locale === "zh-CN"
                ? "这里的内容会被这条此刻的发起者和所有已举手者看到；一对一商量请使用上方私聊。"
                : locale === "fr"
                  ? "Visible par l'hôte et toutes les personnes intéressées. Pour parler à deux, utilisez la discussion privée."
                  : "Visible to the host and everyone interested. Use private chat above to make plans one to one."}
            </p>
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
            {preview ? (
              <div className="mt-4 rounded-2xl border border-[#DDE9E0] bg-white px-3 py-3 text-[12px] text-[#94A498]">
                {copy.message} · 示例预览
              </div>
            ) : (
              <NowMessageForm inviteId={invite.id} locale={locale} />
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
