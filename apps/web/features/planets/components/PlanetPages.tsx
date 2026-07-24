import Link from "next/link";
import { ArrowLeft, Lock, MessageCircle, Orbit, Plus, Send, Sparkles, Trash2, UsersRound } from "lucide-react";
import {
  createPlanetAction,
  createPlanetMomentCommentAction,
  joinPlanetAction,
  leavePlanetAction,
  deletePlanetMomentAction,
} from "@/features/planets/actions/planetActions";
import { withLocale } from "@/lib/routes";
import { buildCanonicalSiteUrl } from "@/lib/site-url";
import { PlanetRoomComposer } from "./PlanetRoomComposer";
import { PlanetRoomFloatingActions } from "./PlanetRoomFloatingActions";
import { PlanetMomentCarousel } from "./PlanetMomentCarousel";
import { PlanetCoverUpload } from "./PlanetCoverUpload";
import { PlanetLeaveButton } from "./PlanetLeaveButton";
import type { getPlanetMoment, getPlanetRoom, getPlanetSquare } from "../queries/planetQueries";

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
    chat: "\u661f\u7403\u7fa4\u804a",
    comments: "\u8bc4\u8bba",
    create: "\u521b\u5efa\u661f\u7403",
    createHint: "\u5f00\u59cb\u4e00\u6761\u65b0\u7684\u8f68\u9053",
    creator: "\u521b\u5efa\u4eba",
    emptyChat: "\u8fd8\u6ca1\u6709\u6d88\u606f\uff0c\u548c\u5927\u5bb6\u6253\u4e2a\u62db\u547c\u5427\u3002",
    memberUnit: "\u4f4d\u6210\u5458",
    moment: "\u7cbe\u5f69\u77ac\u95f4",
    orbit: "\u661f\u7403\u8f68\u8ff9",
    send: "\u8f93\u5165\u6d88\u606f...",
    subtitle: "\u627e\u5230\u9002\u5408\u4f60\u7684\u661f\u7403\u8f68\u9053",
    title: "\u661f\u9645\u4e4b\u95f4",
    apply: "\u7533\u8bf7\u52a0\u5165",
    applied: "\u7b49\u5f85\u5ba1\u6838",
    cancelRequest: "\u53d6\u6d88\u7533\u8bf7",
    pendingNotice: "\u4f60\u7684\u7533\u8bf7\u5df2\u63d0\u4ea4\uff0c\u521b\u5efa\u4eba\u5ba1\u6838\u901a\u8fc7\u540e\u624d\u80fd\u770b\u5230\u7fa4\u804a\u5e76\u53c2\u4e0e\u4e92\u52a8\u3002",
    joinNotice: "\u52a0\u5165\u8fd9\u4e2a\u661f\u7403\u9700\u8981\u521b\u5efa\u4eba\u5ba1\u6838\uff0c\u901a\u8fc7\u540e\u624d\u80fd\u770b\u5230\u7fa4\u804a\u3002",
    pendingChatHint: "\u7b49\u5f85\u901a\u8fc7",
    pendingChatBody: "\u521b\u5efa\u4eba\u901a\u8fc7\u540e\uff0c\u4f60\u5c31\u53ef\u4ee5\u5728\u8fd9\u91cc\u770b\u5230\u7fa4\u804a\uff0c\u4e5f\u80fd\u4e00\u8d77\u804a\u5929\u4e86\u3002",
    joinChatHint: "\u901a\u8fc7\u540e\u53ef\u89c1",
    joinChatBody: "\u7533\u8bf7\u901a\u8fc7\u540e\uff0c\u5c31\u80fd\u5728\u8fd9\u91cc\u804a\u5929\u3002",
    reviewTitle: "\u5f85\u5ba1\u6838\u7533\u8bf7",
    reviewEmpty: "\u6682\u65f6\u6ca1\u6709\u65b0\u7684\u7533\u8bf7\u3002",
    approve: "\u901a\u8fc7",
    reject: "\u62d2\u7edd",
    inviteLink: "\u9080\u8bf7\u94fe\u63a5",
    createLocked: "\u5171\u521b\u4e3b\u7406\u4eba\u53ef\u4ee5\u521b\u5efa\u5e76\u7ba1\u7406\u81ea\u5df1\u7684\u661f\u7403\u3002",
    firstMoment: "\u8fd8\u6ca1\u6709\u8f68\u8ff9\uff0c\u53d1\u5e03\u7b2c\u4e00\u6761\u7cbe\u5f69\u77ac\u95f4\u5427\u3002",
    chatLocked: "\u5ba1\u6838\u901a\u8fc7\u540e\u624d\u80fd\u67e5\u770b\u548c\u53c2\u4e0e\u7fa4\u804a\u3002",
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
    momentLabel: "\u7cbe\u5f69\u77ac\u95f4",
    danmaku: "\u5f39\u5e55",
    danmakuPlaceholder: "\u53d1\u5e03\u5f39\u5e55...",
    delete: "\u5220\u9664",
    planetMoment: "\u661f\u7403\u7cbe\u5f69\u77ac\u95f4",
  },
  en: {
    chat: "Planet chat",
    comments: "Comments",
    create: "Create planet",
    createHint: "Start a new orbit",
    creator: "Creator",
    emptyChat: "No messages yet. Say hello to the planet.",
    memberUnit: "members",
    moment: "Moments",
    orbit: "Planet orbit",
    send: "Write a message...",
    subtitle: "Find the orbit that fits you",
    title: "Between Planets",
    apply: "Request to join",
    applied: "Pending review",
    cancelRequest: "Cancel request",
    pendingNotice: "Your request is pending. You can view the chat after the creator approves it.",
    joinNotice: "Joining this planet requires creator approval before chat becomes visible.",
    pendingChatHint: "Pending approval",
    pendingChatBody: "Once the creator approves you, the messages and composer will appear here automatically.",
    joinChatHint: "Join to view chat",
    joinChatBody: "Send a join request first. After approval, you will be able to read and join the chat.",
    reviewTitle: "Pending requests",
    reviewEmpty: "No pending requests right now.",
    approve: "Approve",
    reject: "Reject",
    inviteLink: "Invite link",
    createLocked: "Co-creators can create and manage their own planets.",
    firstMoment: "No orbit yet. Share the first moment.",
    chatLocked: "Chat becomes available after approval.",
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
    momentLabel: "Moments",
    danmaku: "Comments",
    danmakuPlaceholder: "Write a comment...",
    delete: "Delete",
    planetMoment: "Planet moment",
  },
  fr: {
    chat: "Discussion de la planete",
    comments: "Commentaires",
    create: "Creer une planete",
    createHint: "Lancer une nouvelle orbite",
    creator: "Createur",
    emptyChat: "Aucun message. Dites bonjour a la planete.",
    memberUnit: "membres",
    moment: "Moments",
    orbit: "Trajectoire de la planete",
    send: "Ecrire un message...",
    subtitle: "Trouvez l'orbite qui vous ressemble",
    title: "Entre planetes",
    apply: "Demander a rejoindre",
    applied: "En attente",
    cancelRequest: "Annuler la demande",
    pendingNotice: "Votre demande est en attente. Le chat sera visible apres validation du createur.",
    joinNotice: "Rejoindre cette planete necessite l'accord du createur avant d'acceder au chat.",
    pendingChatHint: "En attente de validation",
    pendingChatBody: "Des que le createur valide votre demande, les messages et la zone d'ecriture apparaissent ici.",
    joinChatHint: "Rejoignez la planete",
    joinChatBody: "Commencez par envoyer une demande. Apres validation, vous pourrez lire et rejoindre le chat.",
    reviewTitle: "Demandes en attente",
    reviewEmpty: "Aucune nouvelle demande pour le moment.",
    approve: "Valider",
    reject: "Refuser",
    inviteLink: "Lien d'invitation",
    createLocked: "Les co-createurs peuvent creer et gerer leurs propres planetes.",
    firstMoment: "Pas encore de trajectoire. Partagez le premier moment.",
    chatLocked: "Le chat devient disponible apres validation.",
    backToSquare: "Retour aux planetes",
    backToPlanet: "Retour a la planete",
    createTitle: "Creer votre planete",
    createSubtitle: "Faites se rencontrer interets, relations et inspirations.",
    nameLabel: "Nom de la planete",
    namePlaceholder: "Exemple : Jeux du week-end",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Expliquez ce que l'on trouve sur cette planete.",
    tagsLabel: "Tags",
    tagsPlaceholder: "jeux, week-end, debutants",
    createButton: "Creer la planete",
    momentLabel: "Moments",
    danmaku: "Commentaires",
    danmakuPlaceholder: "Ecrire un commentaire...",
    delete: "Supprimer",
    planetMoment: "Moment de la planete",
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

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <img alt="" className="h-8 w-8 rounded-full object-cover" src={avatarUrl} />;
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9ead8] text-xs font-black text-[#246044]">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function PlanetCover({ coverImageUrl, index }: { coverImageUrl: string | null; index: number }) {
  return (
    <div className={`relative h-24 overflow-hidden rounded-2xl bg-gradient-to-br ${colorPairs[index % colorPairs.length]}`}>
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100svh] bg-[#f6f1ea] pb-[calc(6.4rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.8rem)] text-[#151713] md:bg-[#edf4fa] md:py-10">
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
          <h1 className="text-xl font-black">{copy.title}</h1>
          <p className="text-xs font-semibold text-[#718075]">{copy.subtitle}</p>
        </div>
      </div>
      {planets.length ? (
        <div className="grid grid-cols-2 gap-3">
          {planets.map((planet, index) => (
            <Link className="group min-w-0" href={withLocale(locale, `/planets/${planet.slug}`)} key={planet.id}>
              <PlanetCover coverImageUrl={planet.coverImageUrl} index={index} />
              <h2 className="mt-2 truncate text-sm font-black group-hover:text-[#1f6a4a]">
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
          杩樻病鏈夋槦鐞冿紝鎴愪负绗竴涓垱寤哄畠鐨勪汉鍚с€?
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
        <button className="rounded-full border border-[#e7c58d] bg-[#fff9ef] px-3 py-1.5 text-xs font-black text-[#9a6a21]" type="submit">
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
      <button className="rounded-full bg-[#246c4b] px-3 py-1.5 text-xs font-black text-white" type="submit">
        {copy.apply}
      </button>
    </form>
  );
}

function PlanetChatLockedNotice({
  body,
  hint,
}: {
  body: string;
  hint: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-[#f1d7b5] bg-[#fff8ef] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffe8c9] text-[#9a6a21]">
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9a6a21]">{hint}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#7d5d2d]">{body}</p>
        </div>
      </div>
    </div>
  );
}

function MomentOrbitCard({
  index,
  locale,
  moment,
  planetSlug,
}: {
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
    <Link className="group w-14 shrink-0 text-center" href={withLocale(locale, `/planets/${planetSlug}/moments/${moment.id}`)}>
      <span
        className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#d9e3d5] bg-gradient-to-br ${orbitColors[index % orbitColors.length]} p-1 shadow-sm transition group-active:scale-95`}
      >
        {moment.imageUrls[0] ? (
          <img alt="" className="h-full w-full rounded-full object-cover" src={moment.imageUrls[0]} />
        ) : (
          <span className="h-full w-full rounded-full border border-white/50 bg-[radial-gradient(circle_at_32%_30%,rgba(255,255,255,.7),transparent_28%),linear-gradient(145deg,transparent_45%,rgba(20,55,42,.2)_46%_56%,transparent_57%)]" />
        )}
      </span>
      <span className="mt-1 block line-clamp-1 text-[10px] font-bold leading-3 text-[#4d6658]">{moment.content.slice(0, 4) || "路路"}</span>
    </Link>
  );
}

export function PlanetRoomPage({ locale, planet }: { locale: string; planet: PlanetRoom }) {
  const copy = getPlanetCopy(locale);
  const membership = planet.viewerMembership;
  const canViewChat = planet.canViewChat;
  const isPending = membership?.status === "PENDING";
  const inviteUrl = buildCanonicalSiteUrl(withLocale(locale, `/planets/invite/${planet.inviteCode}`));
  const pendingChatHint = locale === "fr" ? "En attente de validation" : locale === "en" ? "Pending approval" : "\u7b49\u5f85\u901a\u8fc7";
  const pendingChatBody = locale === "fr"
    ? "Des que le createur valide votre demande, les messages et la zone d'ecriture apparaissent ici."
    : locale === "en"
      ? "Once the creator approves you, the messages and composer will appear here automatically."
      : "\u521b\u5efa\u4eba\u901a\u8fc7\u540e\uff0c\u4f60\u5c31\u53ef\u4ee5\u5728\u8fd9\u91cc\u770b\u5230\u7fa4\u804a\uff0c\u4e5f\u80fd\u4e00\u8d77\u804a\u5929\u4e86\u3002";
  const joinChatHint = locale === "fr" ? "Rejoignez la planete" : locale === "en" ? "Join to view chat" : "\u901a\u8fc7\u540e\u53ef\u89c1";
  const joinChatBody = locale === "fr"
    ? "Commencez par envoyer une demande. Apres validation, vous pourrez lire et rejoindre le chat."
    : locale === "en"
      ? "Send a join request first. After approval, you will be able to read and join the chat."
      : "\u7533\u8bf7\u901a\u8fc7\u540e\uff0c\u5c31\u80fd\u5728\u8fd9\u91cc\u804a\u5929\u3002";
  const reviewerRole = membership?.role === "OWNER" || membership?.role === "ADMIN" ? membership.role : null;
  const pendingMembers = planet.pendingMembers.map((member) => ({
    avatarUrl: member.profile.avatarUrl,
    joinedAtLabel: member.joinedAt.toLocaleDateString(),
    nickname: member.profile.nickname,
    profileId: member.profileId,
  }));

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
        <header className="grid grid-cols-[2rem_1fr_auto] items-center gap-2">
          <Link aria-label={copy.backToSquare} href={withLocale(locale, "/planets")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#152d4b,#4b7690)] text-lg">馃獝</span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black">{getPlanetName(planet, locale)}</h1>
              <p className="text-[10px] text-[#7d877e]">
                {planet._count.members} {copy.memberUnit}
              </p>
            </div>
          </div>
          <MembershipButton locale={locale} planet={planet} />
        </header>

        {isPending ? (
          <p className="mt-4 rounded-2xl bg-[#fff5de] px-4 py-3 text-xs font-semibold leading-5 text-[#91661f]">
            {copy.pendingNotice}
          </p>
        ) : null}

        <section className="mt-5">
          <p className="text-sm font-black text-[#17583d]">{copy.orbit}</p>
          {planet.moments.length ? (
            <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
              {planet.moments.map((moment, index) => (
                <MomentOrbitCard index={index} key={moment.id} locale={locale} moment={moment} planetSlug={planet.slug} />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#889188]">{copy.firstMoment}</p>
          )}
        </section>

        <section className="mt-5 border-t border-[#ece8dc] pt-4">
          <h2 className="text-sm font-black">{copy.chat}</h2>
          {canViewChat ? (
            <div className="mt-3 space-y-3">
              {planet.messages.length ? (
                planet.messages.map((message) => (
                  <div className="flex gap-2" key={message.id}>
                    <Avatar avatarUrl={message.author.avatarUrl} name={message.author.nickname} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black">
                        {message.author.nickname}
                        <span className="ml-1 font-normal text-[#929892]">
                          {message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </p>
                      <p className="mt-1 inline-block rounded-2xl bg-[#f2f2ed] px-3 py-2 text-sm leading-5">{message.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-[#858b84]">{copy.emptyChat}</p>
              )}
            </div>
          ) : (
            <PlanetChatLockedNotice body={isPending ? pendingChatBody : joinChatBody} hint={isPending ? pendingChatHint : joinChatHint} />
          )}
        </section>

        {canViewChat ? (
          <PlanetRoomComposer
            canCreateMoment={String(planet.viewerMembership?.role) === "OWNER"}
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

export function PlanetMomentPage({ locale, moment }: { locale: string; moment: PlanetMoment }) {
  const copy = getPlanetCopy(locale);
  const photoUrls = moment.imageUrls.slice(0, 12);
  const canInteract = moment.viewerMembership?.status === "APPROVED";
  const danmakuDisabledHint = locale === "fr"
    ? "Rejoignez cette planete et attendez la validation pour envoyer un commentaire."
    : locale === "en"
      ? "Join this planet and wait for approval before sending a comment."
      : "加入星球并通过审核后，才可以发送弹幕。";

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
        <header className="flex items-center gap-3">
          <Link aria-label={copy.backToPlanet} href={withLocale(locale, `/planets/${moment.planet.slug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-black">{getPlanetName(moment.planet, locale)}</h1>
            <p className="text-[10px] text-[#778178]">{copy.planetMoment}</p>
          </div>
        </header>
        <article className="mt-4">
          <PlanetMomentCarousel
            authorName={moment.author.nickname}
            comments={moment.comments}
            content={moment.content}
            createdAtLabel={moment.createdAt.toLocaleDateString()}
            imageUrls={photoUrls}
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
        </article>
        <div className="mt-5">
          <form action={createPlanetMomentCommentAction} className="flex gap-2 rounded-[1.4rem] border border-[#e7e0d5] bg-[#fffefa] p-2 shadow-[0_10px_24px_rgba(54,47,35,0.06)]">
            <input name="locale" type="hidden" value={locale} />
            <input name="planetId" type="hidden" value={moment.planet.id} />
            <input name="planetSlug" type="hidden" value={moment.planet.slug} />
            <input name="momentId" type="hidden" value={moment.id} />
            <input className="min-w-0 flex-1 rounded-full bg-[#f7f3ec] px-4 py-3 text-sm outline-none placeholder:text-[#9aa29b] disabled:cursor-not-allowed disabled:opacity-65" disabled={!canInteract} maxLength={1000} name="content" placeholder={copy.danmakuPlaceholder} required />
            <button aria-label={copy.danmaku} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#246c4b] text-white disabled:cursor-not-allowed disabled:opacity-55" disabled={!canInteract} type="submit">
              <Send className="h-4 w-4" />
            </button>
          </form>
          {!canInteract ? (
            <p className="mt-2 px-2 text-xs font-semibold text-[#8b8578]">{danmakuDisabledHint}</p>
          ) : null}
        </div>
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
          <h1 className="mt-2 text-xl font-black">{copy.createTitle}</h1>
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
          <PlanetCoverUpload name="coverImageUrl" />
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246c4b] py-3 font-black text-white">
            <UsersRound className="h-4 w-4" />
            {copy.createButton}
          </button>
        </form>
      </section>
    </PageShell>
  );
}
