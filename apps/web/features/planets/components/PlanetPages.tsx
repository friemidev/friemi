import Link from "next/link";
import { ArrowLeft, MessageCircle, Orbit, Plus, Send, Sparkles, Trash2, UsersRound } from "lucide-react";
import {
  createPlanetAction,
  createPlanetMomentCommentAction,
  joinPlanetAction,
  leavePlanetAction,
  deletePlanetMomentAction,
} from "@/features/planets/actions/planetActions";
import { withLocale } from "@/lib/routes";
import { buildCanonicalSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { PlanetMomentComposer } from "./PlanetMomentComposer";
import { PlanetRoomFloatingActions } from "./PlanetRoomFloatingActions";
import { PlanetMomentCarousel } from "./PlanetMomentCarousel";
import { PlanetCoverUpload } from "./PlanetCoverUpload";
import { PlanetLeaveButton } from "./PlanetLeaveButton";
import type { getPlanetMoment, getPlanetRoom, getPlanetSquare } from "../queries/planetQueries";
import { canInteractWithPlanetMoment } from "../utils/planetMomentPolicy";

type PlanetSquare = Awaited<ReturnType<typeof getPlanetSquare>>;
type PlanetRoom = NonNullable<Awaited<ReturnType<typeof getPlanetRoom>>>;
type PlanetMoment = NonNullable<Awaited<ReturnType<typeof getPlanetMoment>>>;

const colorPairs = [
  "from-[#122b48] via-[#254a70] to-[#7098bc]",
  "from-[#1a294c] via-[#573666] to-[#a8749b]",
  "from-[#356778] via-[#77a1a3] to-[#c3d9ba]",
  "from-[#bf6d48] via-[#eea56c] to-[#f4d2a0]",
  "from-[#235368] via-[#5d92a2] to-[#b9d2d5]",
  "from-[#2d355e] via-[#604577] to-[#ad94d0]",
];

const planetCopy = {
  "zh-CN": {
    openChat: "\u524d\u5f80\u7fa4\u804a",
    pendingChatAction: "\u7b49\u5f85\u5ba1\u6838\u540e\u53ef\u7fa4\u804a",
    joinChatAction: "\u52a0\u5165\u540e\u53ef\u7fa4\u804a",
    create: "\u521b\u5efa\u661f\u7403",
    createHint: "\u5f00\u59cb\u4e00\u6761\u65b0\u7684\u8f68\u9053",
    memberUnit: "\u4f4d\u6210\u5458",
    orbit: "\u661f\u7403\u8f68\u8ff9",
    detailTitle: "\u661f\u7403\u8be6\u60c5",
    hostedBy: "\u521b\u5efa\u4eba",
    subtitle: "\u627e\u5230\u9002\u5408\u4f60\u7684\u661f\u7403\u8f68\u9053",
    title: "\u661f\u9645\u4e4b\u95f4",
    apply: "\u7533\u8bf7\u52a0\u5165",
    cancelRequest: "\u53d6\u6d88\u7533\u8bf7",
    pendingNotice: "\u4f60\u7684\u7533\u8bf7\u5df2\u63d0\u4ea4\uff0c\u521b\u5efa\u4eba\u5ba1\u6838\u901a\u8fc7\u540e\u624d\u80fd\u770b\u5230\u7fa4\u804a\u5e76\u53c2\u4e0e\u4e92\u52a8\u3002",
    createLocked: "\u5171\u521b\u4e3b\u7406\u4eba\u53ef\u4ee5\u521b\u5efa\u5e76\u7ba1\u7406\u81ea\u5df1\u7684\u661f\u7403\u3002",
    firstMoment: "\u8fd8\u6ca1\u6709\u8f68\u8ff9\uff0c\u53d1\u5e03\u7b2c\u4e00\u6761\u7cbe\u5f69\u77ac\u95f4\u5427\u3002",
    backToSquare: "\u8fd4\u56de\u661f\u7403\u5e7f\u573a",
    backToPlanet: "\u8fd4\u56de\u661f\u7403",
    createTitle: "\u521b\u5efa\u4f60\u7684\u661f\u7403",
    createSubtitle: "\u8ba9\u5174\u8da3\u3001\u5173\u7cfb\u548c\u7075\u611f\u5728\u8fd9\u91cc\u76f8\u9047\u3002",
    nameLabel: "\u661f\u7403\u540d\u79f0",
    namePlaceholder: "\u4f8b\u5982\uff1a\u5468\u672b\u684c\u6e38\u661f\u7403",
    descriptionLabel: "\u661f\u7403\u4ecb\u7ecd",
    descriptionPlaceholder: "\u544a\u8bc9\u5927\u5bb6\u8fd9\u4e2a\u661f\u7403\u4f1a\u53d1\u751f\u4ec0\u4e48\u3002",
    tagsLabel: "\u6807\u7b7e",
    tagsPlaceholder: "\u684c\u6e38\uff0c\u5468\u672b\uff0c\u65b0\u624b\u53cb\u597d",
    createButton: "\u521b\u5efa\u5e76\u8fdb\u5165\u661f\u7403",
    danmaku: "\u5f39\u5e55",
    danmakuPlaceholder: "\u53d1\u5e03\u5f39\u5e55...",
    delete: "\u5220\u9664",
    empty: "还没有星球，成为第一个创建它的人吧。",
    momentUnavailable: "\u8be5\u6761\u8f68\u8ff9\u5df2\u5220\u9664\u6216\u6682\u65f6\u4e0d\u53ef\u89c1\uff0c\u5df2\u4e3a\u4f60\u663e\u793a\u6700\u65b0\u5185\u5bb9\u3002",
  },
  en: {
    openChat: "Open group chat",
    pendingChatAction: "Chat available after approval",
    joinChatAction: "Join to open chat",
    create: "Create planet",
    createHint: "Start a new orbit",
    memberUnit: "members",
    orbit: "Planet orbit",
    detailTitle: "Planet Detail",
    hostedBy: "Created by",
    subtitle: "Find the orbit that fits you",
    title: "Between Planets",
    apply: "Request to join",
    cancelRequest: "Cancel request",
    pendingNotice: "Your request is pending. You can view the chat after the creator approves it.",
    createLocked: "Co-creators can create and manage their own planets.",
    firstMoment: "No orbit yet. Share the first moment.",
    backToSquare: "Back to planets",
    backToPlanet: "Back to planet",
    createTitle: "Create your planet",
    createSubtitle: "Let interests, people, and inspiration meet here.",
    nameLabel: "Planet name",
    namePlaceholder: "For example: Weekend Board Games",
    descriptionLabel: "Planet description",
    descriptionPlaceholder: "Tell people what this planet is about.",
    tagsLabel: "Tags",
    tagsPlaceholder: "board games, weekend, beginner-friendly",
    createButton: "Create planet",
    danmaku: "Comments",
    danmakuPlaceholder: "Write a comment...",
    delete: "Delete",
    empty: "No planets yet. Be the first to create one.",
    momentUnavailable: "That moment was removed or is unavailable. The latest content is shown instead.",
  },
  fr: {
    openChat: "Ouvrir la discussion",
    pendingChatAction: "Discussion disponible après validation",
    joinChatAction: "Rejoindre pour discuter",
    create: "Créer une planète",
    createHint: "Lancer une nouvelle orbite",
    memberUnit: "membres",
    orbit: "Trajectoire de la planète",
    detailTitle: "Détail de la planète",
    hostedBy: "Créée par",
    subtitle: "Trouvez l'orbite qui vous ressemble",
    title: "Entre planètes",
    apply: "Demander à rejoindre",
    cancelRequest: "Annuler la demande",
    pendingNotice: "Votre demande est en attente. Le chat sera visible après validation du créateur.",
    createLocked: "Les co-créateurs peuvent créer et gérer leurs propres planètes.",
    firstMoment: "Pas encore de trajectoire. Partagez le premier moment.",
    backToSquare: "Retour aux planètes",
    backToPlanet: "Retour à la planète",
    createTitle: "Créer votre planète",
    createSubtitle: "Faites se rencontrer intérêts, relations et inspirations.",
    nameLabel: "Nom de la planète",
    namePlaceholder: "Exemple : Jeux du week-end",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Expliquez ce que l'on trouve sur cette planète.",
    tagsLabel: "Tags",
    tagsPlaceholder: "jeux, week-end, débutants",
    createButton: "Créer la planète",
    danmaku: "Commentaires",
    danmakuPlaceholder: "Écrire un commentaire...",
    delete: "Supprimer",
    empty: "Aucune planète pour le moment. Créez la première.",
    momentUnavailable: "Ce moment a été supprimé ou n'est plus disponible. Le contenu le plus récent est affiché.",
  },
} as const;

function getPlanetCopy(locale: string) {
  return locale === "en" || locale === "fr" ? planetCopy[locale] : planetCopy["zh-CN"];
}

function getPlanetName(planet: { name: string; nameTranslations?: unknown }, locale: string) {
  if (locale !== "en" && locale !== "fr") return planet.name;
  if (typeof planet.nameTranslations !== "object" || !planet.nameTranslations) return planet.name;
  const translated = (planet.nameTranslations as Record<string, unknown>)[locale];
  return typeof translated === "string" && translated.trim() ? translated : planet.name;
}

function PlanetCover({ coverImageUrl, index }: { coverImageUrl: string | null; index: number }) {
  return (
    <div className={`relative h-24 overflow-hidden rounded-2xl bg-gradient-to-br md:h-32 lg:h-36 ${colorPairs[index % colorPairs.length]}`}>
      {coverImageUrl ? <img alt="" className="absolute inset-0 h-full w-full object-cover" src={coverImageUrl} /> : null}
      {!coverImageUrl ? (
        <>
          <span className="absolute left-4 top-4 h-1.5 w-1.5 rounded-full bg-white/80" />
          <span className="absolute right-5 top-5 h-1 w-1 rounded-full bg-white/70" />
          <span className="absolute bottom-3 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-[#f5dda7] shadow-[inset_-10px_-8px_0_rgba(105,76,60,0.16)]" />
          <span className="absolute bottom-7 left-1/2 h-5 w-20 -translate-x-1/2 rotate-[-18deg] rounded-full border-[5px] border-[#f7f1dc]/90" />
        </>
      ) : null}
    </div>
  );
}

function PageShell({
  children,
  detail = false,
}: {
  children: React.ReactNode;
  detail?: boolean;
}) {
  return (
    <main
      className={cn(
        "app-mobile-page-shell [--app-mobile-page-bottom-gap:1.25rem] text-[#151713]",
        detail
          ? "planet-detail-page [--app-mobile-page-top-gap:1.15rem] bg-white md:py-8"
          : "[--app-mobile-page-top-gap:0.8rem] bg-[#f6f1ea] md:bg-[#edf4fa] md:py-10",
      )}
    >
      {children}
    </main>
  );
}

export function PlanetSquarePage({
  canCreate,
  embedded = false,
  locale,
  planets,
}: {
  canCreate: boolean;
  embedded?: boolean;
  locale: string;
  planets: PlanetSquare;
}) {
  const copy = getPlanetCopy(locale);
  const content = (
    <section
      className={
        embedded
          ? "w-full"
          : "mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl"
      }
    >
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#1f6a4a]" />
        <div>
          <h1 className="text-xl font-bold">{copy.title}</h1>
          <p className="text-xs font-semibold text-[#718075]">{copy.subtitle}</p>
        </div>
      </div>
      {planets.length ? (
        <div
          className={cn(
            "grid grid-cols-2 gap-3",
            embedded && "md:grid-cols-3 md:gap-5 lg:grid-cols-4",
          )}
        >
          {planets.map((planet, index) => (
            <Link className="group min-w-0" href={withLocale(locale, `/planets/${planet.slug}`)} key={planet.id}>
              <PlanetCover coverImageUrl={planet.coverImageUrl} index={index} />
              <h2 className="mt-2 truncate text-sm font-bold group-hover:text-[#1f6a4a]">
                {getPlanetName(planet, locale)}
              </h2>
              <p className="text-[11px] font-semibold text-[#7e827d]">
                {planet._count.members} {copy.memberUnit}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d9d4b5] p-8 text-center text-sm text-[#7e827d]">
          {copy.empty}
        </div>
      )}
      {canCreate ? (
        <Link
          className="mt-4 flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-dashed border-[#c7d5c1] bg-[#fffefb] text-[#216746] shadow-sm"
          href={withLocale(locale, "/planets/create")}
        >
          <Plus className="h-8 w-8" />
          <span>
            <strong className="block text-base">{copy.create}</strong>
            <small className="font-semibold">{copy.createHint}</small>
          </span>
        </Link>
      ) : (
        <p className="mt-4 rounded-2xl bg-[#edf3ea] px-4 py-3 text-center text-xs font-semibold text-[#58715f]">
          {copy.createLocked}
        </p>
      )}
    </section>
  );

  return embedded ? content : <PageShell>{content}</PageShell>;
}

function MembershipButton({ locale, planet }: { locale: string; planet: PlanetRoom }) {
  const copy = getPlanetCopy(locale);
  const membership = planet.viewerMembership;

  if (membership?.role === "OWNER") {
    return null;
  }

  if (membership?.status === "APPROVED") {
    return <PlanetLeaveButton locale={locale} planetId={planet.id} planetSlug={planet.slug} />;
  }

  if (membership?.status === "PENDING") {
    return (
      <form action={leavePlanetAction}>
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planet.id} />
        <input name="planetSlug" type="hidden" value={planet.slug} />
        <button className="rounded-full border border-[#e7c58d] bg-[#fff9ef] px-3 py-1.5 text-xs font-bold text-[#9a6a21]" type="submit">
          {copy.cancelRequest}
        </button>
      </form>
    );
  }

  return (
    <form action={joinPlanetAction}>
      <input name="locale" type="hidden" value={locale} />
      <input name="planetId" type="hidden" value={planet.id} />
      <input name="planetSlug" type="hidden" value={planet.slug} />
      <button className="rounded-full bg-[#246c4b] px-3 py-1.5 text-xs font-bold text-white" type="submit">
        {copy.apply}
      </button>
    </form>
  );
}

function MomentOrbitCard({
  active,
  index,
  locale,
  moment,
  planetSlug,
}: {
  active: boolean;
  index: number;
  locale: string;
  moment: PlanetRoom["moments"][number];
  planetSlug: string;
}) {
  const orbitColors = [
    "from-[#e9d3b4] to-[#b8794b]",
    "from-[#f0d59a] to-[#ce7754]",
    "from-[#bbd8c0] to-[#4c8872]",
    "from-[#cbb8d9] to-[#775d8e]",
    "from-[#bcd4df] to-[#597f9e]",
  ];

  return (
    <Link
      aria-current={active ? "true" : undefined}
      className="group w-14 shrink-0 text-center"
      href={`${withLocale(locale, `/planets/${planetSlug}`)}?moment=${moment.id}#planet-moment`}
      scroll={false}
    >
      <span
        className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-gradient-to-br ${orbitColors[index % orbitColors.length]} p-1 shadow-sm transition group-active:scale-95 ${active ? "border-[#1f6a4a] ring-2 ring-[#b7d7c1] ring-offset-2" : "border-[#d9e3d5]"}`}
      >
        {moment.imageUrls[0] ? (
          <img alt="" className="h-full w-full rounded-full object-cover" src={moment.imageUrls[0]} />
        ) : (
          <span className="h-full w-full rounded-full border border-white/50 bg-[radial-gradient(circle_at_32%_30%,rgba(255,255,255,.7),transparent_28%),linear-gradient(145deg,transparent_45%,rgba(20,55,42,.2)_46%_56%,transparent_57%)]" />
        )}
      </span>
      <span className="mt-1 block line-clamp-1 text-[10px] font-bold leading-3 text-[#4d6658]">{moment.content.slice(0, 4) || "\u661F\u7403"}</span>
    </Link>
  );
}

function PlanetChatEntry({
  locale,
  planet,
  selectedMomentId,
}: {
  locale: string;
  planet: PlanetRoom;
  selectedMomentId?: string;
}) {
  const copy = getPlanetCopy(locale);
  const planetHref = `${withLocale(locale, `/planets/${planet.slug}`)}${
    selectedMomentId ? `?moment=${selectedMomentId}#planet-moment` : ""
  }`;
  const chatHref = `${withLocale(locale, `/planets/${planet.slug}/chat`)}?returnTo=${encodeURIComponent(planetHref)}`;

  if (!planet.canViewChat) return null;

  return (
    <Link
      className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-bold text-white transition active:scale-[0.99] md:mt-0 md:w-auto md:min-w-52"
      href={chatHref}
    >
      <MessageCircle className="h-4 w-4" />
      {copy.openChat}
      {planet.chatUnreadCount > 0 ? (
        planet.isChatMuted ? (
          <span aria-label={`${planet.chatUnreadCount}`} className="h-2 w-2 rounded-full bg-[#FF496F]" />
        ) : (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#155F40]">
            {planet.chatUnreadCount > 99 ? "99+" : planet.chatUnreadCount}
          </span>
        )
      ) : null}
    </Link>
  );
}

function PlanetMomentPanel({ locale, moment }: { locale: string; moment: PlanetMoment }) {
  const copy = getPlanetCopy(locale);
  const canInteract = canInteractWithPlanetMoment(moment.viewerMembership);

  return (
    <section className="scroll-mt-4 pt-5" id="planet-moment">
      <PlanetMomentCarousel
        authorName={moment.author.nickname}
        canLike={canInteract}
        comments={moment.comments}
        content={moment.content}
        createdAtLabel={moment.createdAt.toLocaleDateString(locale)}
        imageUrls={moment.imageUrls.slice(0, 12)}
        isLiked={Boolean(moment.likes?.length)}
        likeCount={moment._count?.likes ?? 0}
        locale={locale}
        momentId={moment.id}
        planetId={moment.planet.id}
        planetSlug={moment.planet.slug}
      />
      {moment.isViewerAuthor ? (
        <form action={deletePlanetMomentAction} className="mt-3 px-2">
          <input name="locale" type="hidden" value={locale} />
          <input name="planetId" type="hidden" value={moment.planet.id} />
          <input name="planetSlug" type="hidden" value={moment.planet.slug} />
          <input name="momentId" type="hidden" value={moment.id} />
          <button className="inline-flex items-center gap-1 text-xs font-bold text-[#b4473c]" type="submit">
            <Trash2 className="h-3.5 w-3.5" />
            {copy.delete}
          </button>
        </form>
      ) : null}

      {canInteract ? (
        <form action={createPlanetMomentCommentAction} className="mt-5 flex gap-2 border-t border-[#ece8dc] pt-4">
          <input name="locale" type="hidden" value={locale} />
          <input name="planetId" type="hidden" value={moment.planet.id} />
          <input name="planetSlug" type="hidden" value={moment.planet.slug} />
          <input name="momentId" type="hidden" value={moment.id} />
          <input
            className="min-w-0 flex-1 rounded-full border border-[#e7e0d5] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#9aa29b]"
            maxLength={1000}
            name="content"
            placeholder={copy.danmakuPlaceholder}
            required
          />
          <button
            aria-label={copy.danmaku}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#246c4b] text-white"
            type="submit"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : null}
    </section>
  );
}

export function PlanetRoomPage({
  locale,
  momentUnavailable,
  planet,
  selectedMoment,
}: {
  locale: string;
  momentUnavailable: boolean;
  planet: PlanetRoom;
  selectedMoment: PlanetMoment | null;
}) {
  const copy = getPlanetCopy(locale);
  const planetSquareHref = withLocale(locale, "/footprints?tab=planet");
  const membership = planet.viewerMembership;
  const isPending = membership?.status === "PENDING";
  const inviteUrl = buildCanonicalSiteUrl(withLocale(locale, `/planets/invite/${planet.inviteCode}`));
  const reviewerRole = membership?.role === "OWNER" || membership?.role === "ADMIN" ? membership.role : null;
  const pendingMembers = planet.pendingMembers.map((member) => ({
    avatarUrl: member.profile.avatarUrl,
    joinedAtLabel: member.joinedAt.toLocaleDateString(),
    nickname: member.profile.nickname,
    profileId: member.profileId,
  }));

  return (
    <PageShell detail>
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-3 md:hidden">
          <Link
            aria-label={copy.backToSquare}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111210]/70 ring-1 ring-[#E7E1CA] transition active:scale-95"
            href={planetSquareHref}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <p className="truncate text-center text-[18px] font-bold leading-none text-[#111210]">
            {getPlanetName(planet, locale)}
          </p>
          <span aria-hidden="true" />
        </header>

        <Link
          className="hidden items-center gap-2 text-sm font-bold text-[#156240] md:inline-flex"
          href={planetSquareHref}
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.backToSquare}
        </Link>

        <div className="mt-6 flex min-w-0 items-start justify-between gap-4 md:mt-5">
          <div className="min-w-0">
            <h1 className="break-words text-[1.75rem] font-bold leading-[1.08] text-[#111210] sm:text-4xl md:text-5xl">
              {getPlanetName(planet, locale)}
            </h1>
            <p className="mt-2 text-xs font-semibold text-[#6C746A] sm:text-sm">
              {planet._count.members} {copy.memberUnit} · {copy.hostedBy} {planet.owner.nickname}
            </p>
          </div>
          <div className="shrink-0 pt-0.5">
            <MembershipButton locale={locale} planet={planet} />
          </div>
        </div>

        <div className="relative mt-5 aspect-[1.72/1] overflow-hidden rounded-[1.35rem] bg-[#156240] sm:aspect-[16/8] md:aspect-[2.35/1]">
          {planet.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={getPlanetName(planet, locale)}
              className="h-full w-full object-cover"
              src={planet.coverImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/90">
              <Orbit className="h-20 w-20 sm:h-24 sm:w-24" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-8">
          <div className="min-w-0">
            {planet.description ? (
              <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-[#4F5750]">
                {planet.description}
              </p>
            ) : null}

            {planet.members.length > 0 ? (
              <div className={cn("flex items-center", planet.description ? "mt-4" : null)}>
                <div className="flex -space-x-2">
                  {planet.members.map((member) => (
                    <Link
                      aria-label={member.profile.nickname}
                      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#ECF5EF] text-xs font-bold text-[#156240] ring-1 ring-[#D8E8DC] transition hover:z-10 hover:-translate-y-0.5 hover:ring-[#156240] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156240]"
                      href={withLocale(locale, `/profile/${member.profileId}`)}
                      key={member.profileId}
                      title={member.profile.nickname}
                    >
                      {member.profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={member.profile.avatarUrl}
                        />
                      ) : (
                        member.profile.nickname.slice(0, 1).toUpperCase()
                      )}
                    </Link>
                  ))}
                </div>
                <span className="ml-3 text-xs font-semibold text-[#6C746A]">
                  {planet._count.members} {copy.memberUnit}
                </span>
              </div>
            ) : null}

            {planet.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                {planet.tags.map((tag) => (
                  <span className="text-xs font-bold text-[#156240]" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <PlanetChatEntry
            locale={locale}
            planet={planet}
            selectedMomentId={selectedMoment?.id}
          />
        </div>

        {isPending ? (
          <p className="mt-5 border-l-2 border-[#D4A95B] pl-3 text-xs font-semibold leading-5 text-[#83642F]">
            {copy.pendingNotice}
          </p>
        ) : null}

        <div className="mx-auto mt-8 max-w-2xl border-t border-[#E9E9E4] pt-6 md:mt-10 md:pt-8">
          {planet.moments.length ? (
            <section>
              <p className="text-sm font-bold text-[#17583d]">{copy.orbit}</p>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {planet.moments.map((moment, index) => (
                  <MomentOrbitCard
                    active={moment.id === selectedMoment?.id}
                    index={index}
                    key={moment.id}
                    locale={locale}
                    moment={moment}
                    planetSlug={planet.slug}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {momentUnavailable ? (
            <p className="mt-4 border-l-2 border-[#d4a95b] pl-3 text-xs font-semibold leading-5 text-[#83642f]">
              {copy.momentUnavailable}
            </p>
          ) : null}

          {selectedMoment ? (
            <PlanetMomentPanel locale={locale} moment={selectedMoment} />
          ) : (
            <p className="py-10 text-center text-sm font-semibold text-[#889188]">{copy.firstMoment}</p>
          )}
        </div>

        {membership?.role === "OWNER" && membership.status === "APPROVED" ? (
          <PlanetMomentComposer
            locale={locale}
            planetId={planet.id}
            planetSlug={planet.slug}
          />
        ) : null}

        {reviewerRole ? (
          <PlanetRoomFloatingActions
            inviteUrl={inviteUrl}
            locale={locale}
            pendingMembers={pendingMembers}
            planetId={planet.id}
            planetSlug={planet.slug}
            viewerRole={reviewerRole}
          />
        ) : null}
      </section>
    </PageShell>
  );
}

export function PlanetCreatePage({ locale }: { locale: string }) {
  const copy = getPlanetCopy(locale);

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
        <Link className="inline-flex items-center gap-2 text-sm font-bold" href={withLocale(locale, "/planets")}>
          <ArrowLeft className="h-5 w-5" />
          {copy.backToPlanet}
        </Link>
        <div className="mt-6 rounded-3xl bg-[linear-gradient(135deg,#163250,#3c6e75)] p-6 text-center text-white">
          <Orbit className="mx-auto h-12 w-12" />
          <h1 className="mt-2 text-xl font-bold">{copy.createTitle}</h1>
          <p className="mt-1 text-xs text-white/75">{copy.createSubtitle}</p>
        </div>
        <form action={createPlanetAction} className="mt-5 space-y-4">
          <input name="locale" type="hidden" value={locale} />
          <label className="block text-sm font-bold">
            {copy.nameLabel}
            <input className="mt-2 w-full rounded-xl border border-[#dfdbcf] px-3 py-3 font-normal outline-none" maxLength={60} minLength={2} name="name" placeholder={copy.namePlaceholder} required />
          </label>
          <label className="block text-sm font-bold">
            {copy.descriptionLabel}
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#dfdbcf] px-3 py-3 font-normal outline-none" maxLength={500} name="description" placeholder={copy.descriptionPlaceholder} />
          </label>
          <label className="block text-sm font-bold">
            {copy.tagsLabel}
            <input className="mt-2 w-full rounded-xl border border-[#dfdbcf] px-3 py-3 font-normal outline-none" maxLength={160} name="tags" placeholder={copy.tagsPlaceholder} />
          </label>
          <PlanetCoverUpload locale={locale} name="coverImageUrl" />
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246c4b] py-3 font-bold text-white">
            <UsersRound className="h-4 w-4" />
            {copy.createButton}
          </button>
        </form>
      </section>
    </PageShell>
  );
}
