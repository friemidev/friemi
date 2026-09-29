import Link from "next/link";
import { Lock, Megaphone, MessageCircle } from "lucide-react";
import { RetainedImage } from "@/components/media/RetainedImage";
import { withLocale } from "@/lib/routes";
import { buildCanonicalSiteUrl } from "@/lib/site-url";
import type { getPlanetChatPageData } from "../queries/planetQueries";
import { PlanetChatBackButton } from "./PlanetChatBackButton";
import { PlanetChatComposer } from "./PlanetChatComposer";
import { PlanetChatSettingsMenu } from "./PlanetChatSettingsMenu";
import { PlanetChatThread } from "./PlanetChatThread";

type PlanetChat = NonNullable<
  Awaited<ReturnType<typeof getPlanetChatPageData>>
>;

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Retour",
      locked:
        "La discussion est disponible uniquement pour les membres validés.",
      pending:
        "Votre demande doit être validée avant d'accéder à la discussion.",
      returnToPlanet: "Retour à la planète",
    };
  }

  if (locale === "en") {
    return {
      back: "Back",
      locked: "Chat is available to approved members only.",
      pending: "Your request must be approved before you can open this chat.",
      returnToPlanet: "Back to planet",
    };
  }

  return {
    back: "返回",
    locked: "群聊仅对审核通过的成员开放。",
    pending: "加入申请审核通过后才能进入群聊。",
    returnToPlanet: "返回星球",
  };
}

function getPlanetName(planet: PlanetChat, locale: string) {
  if (locale !== "en" && locale !== "fr") return planet.name;
  if (typeof planet.nameTranslations !== "object" || !planet.nameTranslations)
    return planet.name;
  const translated = (planet.nameTranslations as Record<string, unknown>)[
    locale
  ];
  return typeof translated === "string" && translated.trim()
    ? translated
    : planet.name;
}

export function PlanetChatPage({
  fallbackHref,
  locale,
  planet,
  viewerProfileId,
}: {
  fallbackHref: string;
  locale: string;
  planet: PlanetChat;
  viewerProfileId: string | null;
}) {
  const copy = getCopy(locale);
  const planetHref = withLocale(locale, `/planets/${planet.slug}`);
  const name = getPlanetName(planet, locale);
  const lockedMessage =
    planet.viewerMembership?.status === "PENDING" ? copy.pending : copy.locked;
  const managementActivities = [
    ...planet.activityLinks.map(({ activity }) => activity),
    ...planet.availableActivities,
  ].filter(
    (activity, index, activities) =>
      activities.findIndex((candidate) => candidate.id === activity.id) ===
      index,
  );
  const messages = planet.messages.map((message) => ({
    id: message.id,
    author: message.author,
    authorId: message.authorId,
    content: message.content,
    imageUrls: message.imageUrls,
    mentionedProfileIds: message.mentionedProfileIds,
    mentionLabels: message.mentionLabels,
    mentionsEveryone: message.mentionsEveryone,
    replyTo:
      message.replyToMessageId && message.replyToSenderName
        ? {
            body: message.replyToBody ?? "",
            hasImage: message.replyToHasImage,
            messageId: message.replyToMessageId,
            senderName: message.replyToSenderName,
          }
        : null,
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <main className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-hidden max-md:bg-white md:min-h-[calc(100dvh-5rem)] md:bg-[#EDF4FA] md:px-5 md:py-8">
      <section className="mobile-chat-viewport mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-white text-[#111210] md:h-[calc(100dvh-8rem)] md:rounded-[1.25rem] md:border md:border-[#E2DFD3]">
        <header className="grid min-w-0 shrink-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 border-b border-[#E8E5DA] bg-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:pt-3">
          <PlanetChatBackButton fallbackHref={fallbackHref} label={copy.back} />
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#E6F0E9] text-[#155F40]">
              <MessageCircle className="h-5 w-5" />
              {planet.coverImageUrl ? (
                <RetainedImage
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  src={planet.coverImageUrl}
                />
              ) : null}
            </span>
            <h1 className="truncate text-base font-bold">{name}</h1>
          </div>
          {planet.canViewChat ? (
            <PlanetChatSettingsMenu
              announcement={planet.announcement}
              approvedMembers={planet.approvedMembers.map((member) => ({
                avatarUrl: member.profile.avatarUrl,
                nickname: member.profile.nickname,
                profileId: member.profileId,
                role: member.role,
              }))}
              availableActivities={managementActivities.map((activity) => ({
                id: activity.id,
                startAtLabel: activity.startAt.toLocaleDateString(locale),
                title: activity.title,
              }))}
              inviteUrl={buildCanonicalSiteUrl(
                withLocale(locale, `/planets/invite/${planet.inviteCode}`),
              )}
              isMuted={planet.isMuted}
              isPinned={planet.isPinned}
              linkedActivityIds={planet.activityLinks.map(
                (activityLink) => activityLink.activityId,
              )}
              locale={locale}
              pendingMembers={planet.pendingMembers.map((member) => ({
                avatarUrl: member.profile.avatarUrl,
                joinedAtLabel: member.joinedAt.toLocaleDateString(locale),
                nickname: member.profile.nickname,
                profileId: member.profileId,
              }))}
              planetHref={planetHref}
              planetId={planet.id}
              planetSlug={planet.slug}
              viewerRole={planet.viewerMembership?.role ?? null}
            />
          ) : (
            <span aria-hidden="true" />
          )}
        </header>

        {!planet.canViewChat || !viewerProfileId ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-7 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF1EC] text-[#6F786F]">
              <Lock className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#676E67]">
              {lockedMessage}
            </p>
            <Link
              className="mt-5 rounded-full bg-[#155F40] px-5 py-2.5 text-sm font-bold text-white"
              href={planetHref}
            >
              {copy.returnToPlanet}
            </Link>
          </div>
        ) : (
          <>
            {planet.announcement ? (
              <div className="flex shrink-0 items-start gap-2 border-b border-[#E8E5DA] bg-[#FFF9ED] px-4 py-2.5 text-xs leading-5 text-[#725522]">
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p className="line-clamp-2 whitespace-pre-wrap">
                  {planet.announcement}
                </p>
              </div>
            ) : null}
            <PlanetChatThread
              locale={locale}
              messages={messages}
              planetId={planet.id}
              viewerProfileId={viewerProfileId}
            />
            <footer className="min-w-0 shrink-0 border-t border-[#E8E5DA] bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:rounded-b-[1.25rem] md:pb-3">
              <PlanetChatComposer
                locale={locale}
                planetId={planet.id}
                planetSlug={planet.slug}
              />
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
