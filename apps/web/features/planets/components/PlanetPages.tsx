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
    chat: "星球群聊",
    comments: "评论",
    create: "创建星球",
    createHint: "开始一条新的轨道",
    creator: "创建人",
    emptyChat: "还没有消息，和大家打个招呼吧。",
    memberUnit: "位成员",
    moment: "精彩瞬间",
    orbit: "星球轨迹",
    send: "输入消息...",
    subtitle: "找到适合你的星球轨道",
    title: "星际之间",
    apply: "申请加入",
    applied: "等待审核",
    cancelRequest: "取消申请",
    pendingNotice: "你的申请已提交，创建人审核通过后才能看到群聊并参与互动。",
    joinNotice: "加入这个星球需要创建人审核，通过后才能看到群聊。",
    pendingChatHint: "?????????",
    pendingChatBody: "????????????????????????????????????",
    joinChatHint: "??????????????",
    joinChatBody: "????????????????????????????",
    reviewTitle: "待审核申请",
    reviewEmpty: "暂时没有新的申请。",
    approve: "通过",
    reject: "拒绝",
    inviteLink: "邀请链接",
    createLocked: "共创主理人可以创建并管理自己的星球。",
    firstMoment: "还没有轨迹，发布第一条精彩瞬间吧。",
    chatLocked: "审核通过后才能查看和参与群聊。",
    backToSquare: "返回星球广场",
    backToPlanet: "返回星球",
    createTitle: "创建你的星球",
    createSubtitle: "让兴趣、关系和灵感在这里相遇。",
    nameLabel: "星球名称",
    namePlaceholder: "例如：周末桌游星球",
    descriptionLabel: "星球介绍",
    descriptionPlaceholder: "告诉大家这个星球会发生什么。",
    tagsLabel: "标签",
    tagsPlaceholder: "桌游，周末，新手友好",
    createButton: "创建并进入星球",
    momentLabel: "精彩瞬间",
    danmaku: "弹幕",
    danmakuPlaceholder: "发布弹幕...",
    delete: "删除",
    planetMoment: "星球精彩瞬间",
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
    pendingChatHint: "Status: pending review",
    pendingChatBody: "Once the creator approves you, the messages and composer will appear here automatically.",
    joinChatHint: "Status: approved members only",
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
    chat: "Discussion de la planète",
    comments: "Commentaires",
    create: "Créer une planète",
    createHint: "Lancer une nouvelle orbite",
    creator: "Créateur",
    emptyChat: "Aucun message. Dites bonjour à la planète.",
    memberUnit: "membres",
    moment: "Moments",
    orbit: "Trajectoire de la planète",
    send: "Écrire un message...",
    subtitle: "Trouvez l'orbite qui vous ressemble",
    title: "Entre planètes",
    apply: "Demander à rejoindre",
    applied: "En attente",
    cancelRequest: "Annuler la demande",
    pendingNotice: "Votre demande est en attente. Le chat sera visible après validation du créateur.",
    joinNotice: "Rejoindre cette planète nécessite l'accord du créateur avant d'accéder au chat.",
    reviewTitle: "Demandes en attente",
    reviewEmpty: "Aucune nouvelle demande pour le moment.",
    approve: "Valider",
    reject: "Refuser",
    inviteLink: "Lien d'invitation",
    createLocked: "Les co-créateurs peuvent créer et gérer leurs propres planètes.",
    firstMoment: "Pas encore de trajectoire. Partagez le premier moment.",
    chatLocked: "Le chat devient disponible après validation.",
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
    momentLabel: "Moments",
    danmaku: "Commentaires",
    danmakuPlaceholder: "Écrire un commentaire...",
    delete: "Supprimer",
    planetMoment: "Moment de la planète",
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
          还没有星球，成为第一个创建它的人吧。
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
      <span className="mt-1 block line-clamp-1 text-[10px] font-bold leading-3 text-[#4d6658]">{moment.content.slice(0, 4) || "··"}</span>
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
    ? "D?s que le createur valide votre demande, les messages et la zone d'ecriture apparaissent ici."
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#152d4b,#4b7690)] text-lg">🪐</span>
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
          <div className="mt-4 rounded-2xl bg-white/80 p-3">
            <div className="flex items-center gap-2">
              <Avatar avatarUrl={moment.author.avatarUrl} name={moment.author.nickname} />
              <div>
                <p className="text-sm font-black">{moment.author.nickname}</p>
                <p className="text-[11px] text-[#7d877e]">{moment.createdAt.toLocaleDateString()}</p>
              </div>
            </div>
            {moment.content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{moment.content}</p> : null}
            {moment.isViewerAuthor ? (
              <form action={deletePlanetMomentAction} className="mt-2">
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
          </div>
        </article>
        <section className="mt-5">
          <h2 className="text-sm font-black">
            {copy.danmaku} {moment.comments.length}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {moment.comments.map((comment) => (
              <div className="max-w-full rounded-full bg-[#eef4eb] px-3 py-2 text-xs font-bold text-[#245f43]" key={comment.id}>
                {comment.author.nickname}：{comment.content}
              </div>
            ))}
          </div>
          {canInteract ? (
            <form action={createPlanetMomentCommentAction} className="mt-4 flex gap-2">
              <input name="locale" type="hidden" value={locale} />
              <input name="planetId" type="hidden" value={moment.planet.id} />
              <input name="planetSlug" type="hidden" value={moment.planet.slug} />
              <input name="momentId" type="hidden" value={moment.id} />
              <input className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none" maxLength={1000} name="content" placeholder={copy.danmakuPlaceholder} required />
              <button aria-label={copy.danmaku} className="rounded-full bg-[#246c4b] p-2 text-white" type="submit">
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : null}
        </section>
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
