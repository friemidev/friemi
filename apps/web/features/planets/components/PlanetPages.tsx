import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle, Orbit, Plus, Send, Sparkles, Trash2, UsersRound } from "lucide-react";
import {
  createPlanetAction,
  createPlanetMomentAction,
  createPlanetMomentCommentAction,
  joinPlanetAction,
  leavePlanetAction,
  sendPlanetMessageAction,
  togglePlanetMomentLikeAction,
  deletePlanetMomentAction,
  togglePlanetCommentLikeAction,
} from "@/features/planets/actions/planetActions";
import { withLocale } from "@/lib/routes";
import { PlanetRoomComposer } from "./PlanetRoomComposer";
import { ActivityCoverUpload } from "@/features/activities/components/ActivityCoverUpload";
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
    createHint: "星球聚变",
    creator: "创建者",
    emptyChat: "还没有消息，和大家打个招呼吧。",
    memberUnit: "位成员",
    moment: "精彩瞬间",
    orbit: "星球轨迹",
    send: "输入消息...",
    subtitle: "汇聚你所需的星球",
    title: "星际之间",
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
  },
  fr: {
    chat: "Discussion de la planète",
    comments: "Commentaires",
    create: "Créer une planète",
    createHint: "Créer une nouvelle orbite",
    creator: "Créateur",
    emptyChat: "Aucun message. Dites bonjour à la planète.",
    memberUnit: "membres",
    moment: "Moments",
    orbit: "Trajectoire de la planète",
    send: "Écrire un message...",
    subtitle: "Trouvez l'orbite qui vous ressemble",
    title: "Entre planètes",
  },
} as const;

function getPlanetCopy(locale: string) {
  return locale === "en" || locale === "fr" ? planetCopy[locale] : planetCopy["zh-CN"];
}

function getPlanetName(
  planet: { name: string; nameTranslations?: unknown },
  locale: string,
) {
  if (locale !== "en" && locale !== "fr") return planet.name;
  if (typeof planet.nameTranslations !== "object" || !planet.nameTranslations) return planet.name;
  const translated = (planet.nameTranslations as Record<string, unknown>)[locale];
  return typeof translated === "string" && translated.trim() ? translated : planet.name;
}

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <img alt="" className="h-8 w-8 rounded-full object-cover" src={avatarUrl} />;
  }

  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9ead8] text-xs font-black text-[#246044]">{name.slice(0, 1).toUpperCase()}</span>;
}

function PlanetCover({ coverImageUrl, index }: { coverImageUrl: string | null; index: number }) {
  return (
    <div className={`relative h-24 overflow-hidden rounded-2xl bg-gradient-to-br ${colorPairs[index % colorPairs.length]}`}>
      {coverImageUrl ? <img alt="" className="absolute inset-0 h-full w-full object-cover" src={coverImageUrl} /> : null}
      {!coverImageUrl ? <><span className="absolute left-4 top-4 h-1.5 w-1.5 rounded-full bg-white/80" />
      <span className="absolute right-5 top-5 h-1 w-1 rounded-full bg-white/70" />
      <span className="absolute bottom-3 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-[#f5dda7] shadow-[inset_-10px_-8px_0_rgba(105,76,60,0.16)]" />
      <span className="absolute bottom-7 left-1/2 h-5 w-20 -translate-x-1/2 rotate-[-18deg] rounded-full border-[5px] border-[#f7f1dc]/90" /></> : null}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[100svh] bg-[#f6f1ea] pb-[calc(6.4rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.8rem)] text-[#151713] md:bg-[#edf4fa] md:py-10">{children}</main>;
}

export function PlanetSquarePage({ canCreate, locale, planets }: { canCreate: boolean; locale: string; planets: PlanetSquare }) {
  const copy = getPlanetCopy(locale);
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#1f6a4a]" />
          <div><h1 className="text-xl font-black">{copy.title}</h1><p className="text-xs font-semibold text-[#718075]">{copy.subtitle}</p></div>
        </div>
        {planets.length ? <div className="grid grid-cols-2 gap-3">{planets.map((planet, index) => (
          <Link className="group min-w-0" href={withLocale(locale, `/planets/${planet.slug}`)} key={planet.id}>
            <PlanetCover coverImageUrl={planet.coverImageUrl} index={index} />
            <h2 className="mt-2 truncate text-sm font-black group-hover:text-[#1f6a4a]">{getPlanetName(planet, locale)}</h2>
            <p className="text-[11px] font-semibold text-[#7e827d]">{planet._count.members} {copy.memberUnit}</p>
          </Link>
        ))}</div> : <div className="rounded-2xl border border-dashed border-[#d9d4b5] p-8 text-center text-sm text-[#7e827d]">还没有星球，成为第一个创建它的人吧。</div>}
        {canCreate ? <Link className="mt-4 flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-dashed border-[#c7d5c1] bg-[#fffefb] text-[#216746] shadow-sm" href={withLocale(locale, "/planets/create")}>
          <Plus className="h-8 w-8" /><span><strong className="block text-base">{copy.create}</strong><small className="font-semibold">{copy.createHint}</small></span>
        </Link> : <p className="mt-4 rounded-2xl bg-[#edf3ea] px-4 py-3 text-center text-xs font-semibold text-[#58715f]">共创主理人可以创建并管理自己的星球。</p>}
      </section>
    </PageShell>
  );
}

function MembershipButton({ locale, planet }: { locale: string; planet: PlanetRoom }) {
  const copy = getPlanetCopy(locale);
  const joined = Boolean(planet.viewerMembership);

  if (joined && planet.viewerMembership?.role !== "OWNER") {
    return <PlanetLeaveButton locale={locale} planetId={planet.id} planetSlug={planet.slug} />;
  }

  const label = joined
    ? copy.creator
    : locale === "fr"
      ? "Rejoindre"
      : locale === "en"
        ? "Join"
        : "\u52a0\u5165\u661f\u7403";

  return <form action={joinPlanetAction}><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={planet.id} /><input name="planetSlug" type="hidden" value={planet.slug} /><button className="rounded-full bg-[#246c4b] px-3 py-1.5 text-xs font-black text-white disabled:opacity-70" disabled={joined}>{label}</button></form>;
}
function LegacyPlanetRoomPage({ locale, planet }: { locale: string; planet: PlanetRoom }) {
  const joined = Boolean(planet.viewerMembership);
  return <PageShell><section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
    <div className="flex items-center justify-between"><Link aria-label="返回星球" href={withLocale(locale, "/planets")}><ArrowLeft className="h-5 w-5" /></Link><div className="text-center"><h1 className="text-sm font-black">{planet.name}</h1><p className="text-[10px] text-[#778178]">{planet._count.members} 位成员</p></div><MembershipButton locale={locale} planet={planet} /></div>
    <div className="mt-4 rounded-2xl bg-[#edf3ea] p-3"><p className="text-xs font-bold text-[#276949]">星球轨迹</p><div className="mt-2 flex gap-2 overflow-x-auto">{planet.members.map((member) => <div className="w-12 shrink-0 text-center" key={member.profileId}><Avatar avatarUrl={member.profile.avatarUrl} name={member.profile.nickname} /><span className="mt-1 block truncate text-[9px] font-semibold">{member.profile.nickname}</span></div>)}</div>{planet.viewerMembership?.role === "OWNER" ? <p className="mt-3 rounded-lg bg-white/80 px-2 py-2 text-[10px] font-semibold text-[#487055]">私密邀请链接：{withLocale(locale, `/planets/invite/${planet.inviteCode}`)}</p> : null}</div>
    <div className="mt-5"><h2 className="text-sm font-black">星球群聊</h2><div className="mt-3 space-y-3">{planet.messages.length ? planet.messages.map((message) => <div className="flex gap-2" key={message.id}><Avatar avatarUrl={message.author.avatarUrl} name={message.author.nickname} /><div><p className="text-[11px] font-black">{message.author.nickname} <span className="ml-1 font-normal text-[#929892]">{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p><p className="mt-1 inline-block rounded-2xl bg-[#f2f2ed] px-3 py-2 text-sm">{message.content}</p></div></div>) : <p className="py-4 text-center text-sm text-[#858b84]">还没有消息，和大家打个招呼吧。</p>}</div></div>
    {joined ? <form action={sendPlanetMessageAction} className="mt-4 flex gap-2 border-t border-[#ece8dc] pt-3"><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={planet.id} /><input name="planetSlug" type="hidden" value={planet.slug} /><input className="min-w-0 flex-1 rounded-full bg-[#f2f1ec] px-4 py-2 text-sm outline-none" maxLength={1000} name="content" placeholder="输入消息..." required /><button aria-label="发送" className="rounded-full bg-[#246c4b] p-2 text-white"><Send className="h-4 w-4" /></button></form> : <p className="mt-4 rounded-xl bg-[#fff5e9] p-3 text-center text-xs font-semibold text-[#947147]">加入星球后可以参与聊天与发布动态。</p>}
    <div className="mt-7 border-t border-[#ece8dc] pt-4"><div className="flex items-center justify-between"><h2 className="text-sm font-black">精彩瞬间</h2><MessageCircle className="h-4 w-4 text-[#2c6d4e]" /></div>{planet.moments.length ? <div className="mt-3 space-y-3">{planet.moments.map((moment) => <Link className="block rounded-2xl bg-[#f9f7f1] p-3" href={withLocale(locale, `/planets/${planet.slug}/moments/${moment.id}`)} key={moment.id}><p className="text-xs font-black">{moment.author.nickname}</p><p className="mt-1 line-clamp-2 text-sm">{moment.content}</p><p className="mt-2 text-[11px] text-[#768078]">{moment._count.comments} 条评论</p></Link>)}</div> : <p className="mt-3 text-sm text-[#858b84]">第一条精彩瞬间，等待你发布。</p>}{joined ? <form action={createPlanetMomentAction} className="mt-3 flex gap-2"><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={planet.id} /><input name="planetSlug" type="hidden" value={planet.slug} /><input className="min-w-0 flex-1 rounded-xl border border-[#e1ddd0] px-3 py-2 text-sm outline-none" maxLength={2000} name="content" placeholder="分享这个星球的精彩瞬间" required /><button className="rounded-xl bg-[#246c4b] px-3 text-xs font-black text-white">发布</button></form> : null}</div>
  </section></PageShell>;
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
    <Link
      className="group w-14 shrink-0 text-center"
      href={withLocale(locale, `/planets/${planetSlug}/moments/${moment.id}`)}
    >
      <span className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#d9e3d5] bg-gradient-to-br ${orbitColors[index % orbitColors.length]} p-1 shadow-sm transition group-active:scale-95`}>
        {moment.imageUrls[0] ? <img alt="" className="h-full w-full rounded-full object-cover" src={moment.imageUrls[0]} /> : <span className="h-full w-full rounded-full border border-white/50 bg-[radial-gradient(circle_at_32%_30%,rgba(255,255,255,.7),transparent_28%),linear-gradient(145deg,transparent_45%,rgba(20,55,42,.2)_46%_56%,transparent_57%)]" />}
      </span>
      <span className="mt-1 block line-clamp-1 text-[10px] font-bold leading-3 text-[#4d6658]">{moment.content.slice(0, 4)}</span>
    </Link>
  );
}

export function PlanetRoomPage({ locale, planet }: { locale: string; planet: PlanetRoom }) {
  const copy = getPlanetCopy(locale);
  const joined = Boolean(planet.viewerMembership);

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
        <header className="grid grid-cols-[2rem_1fr_auto] items-center gap-2">
          <Link aria-label="返回星球广场" href={withLocale(locale, "/planets")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#152d4b,#4b7690)] text-lg">🪐</span>
            <div className="min-w-0"><h1 className="truncate text-sm font-black">{getPlanetName(planet, locale)}</h1><p className="text-[10px] text-[#7d877e]">{planet._count.members} {copy.memberUnit}</p></div>
          </div>
          <MembershipButton locale={locale} planet={planet} />
        </header>

        <section className="mt-5">
          <p className="text-sm font-black text-[#17583d]">{copy.orbit}</p>
          {planet.moments.length ? <div className="mt-2 flex gap-3 overflow-x-auto pb-1">{planet.moments.map((moment, index) => <MomentOrbitCard index={index} key={moment.id} locale={locale} moment={moment} planetSlug={planet.slug} />)}</div> : <p className="mt-2 text-xs text-[#889188]">还没有轨迹，发布第一条精彩瞬间吧。</p>}
        </section>

        <section className="mt-5 border-t border-[#ece8dc] pt-4">
          <h2 className="text-sm font-black">{copy.chat}</h2>
          <div className="mt-3 space-y-3">
            {planet.messages.length ? planet.messages.map((message) => <div className="flex gap-2" key={message.id}><Avatar avatarUrl={message.author.avatarUrl} name={message.author.nickname} /><div className="min-w-0"><p className="text-[11px] font-black">{message.author.nickname}<span className="ml-1 font-normal text-[#929892]">{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p><p className="mt-1 inline-block rounded-2xl bg-[#f2f2ed] px-3 py-2 text-sm leading-5">{message.content}</p></div></div>) : <p className="py-4 text-center text-sm text-[#858b84]">{copy.emptyChat}</p>}
          </div>
        </section>

        {joined ? <PlanetRoomComposer locale={locale} planetId={planet.id} planetSlug={planet.slug} /> : <p className="mt-4 rounded-xl bg-[#fff5e9] p-3 text-center text-xs font-semibold text-[#947147]">加入星球后可以参与群聊和发布动态。</p>}
      </section>
    </PageShell>
  );
}

function LegacyPlanetMomentPage({ locale, moment }: { locale: string; moment: PlanetMoment }) {
  return <PageShell><section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl"><Link className="inline-flex items-center gap-2 text-sm font-bold" href={withLocale(locale, `/planets/${moment.planet.slug}`)}><ArrowLeft className="h-5 w-5" />{moment.planet.name}</Link><article className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Avatar avatarUrl={moment.author.avatarUrl} name={moment.author.nickname} /><div><p className="text-sm font-black">{moment.author.nickname}</p><p className="text-[11px] text-[#7d877e]">星球精彩瞬间</p></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{moment.content}</p></article><section className="mt-5"><h2 className="text-sm font-black">评论 {moment.comments.length}</h2><div className="mt-3 space-y-3">{moment.comments.map((comment) => <div className="flex gap-2" key={comment.id}><Avatar avatarUrl={comment.author.avatarUrl} name={comment.author.nickname} /><div><p className="text-xs font-black">{comment.author.nickname}</p><p className="text-sm">{comment.content}</p></div></div>)}</div>{moment.viewerMembership ? <form action={createPlanetMomentCommentAction} className="mt-4 flex gap-2"><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={moment.planet.id} /><input name="planetSlug" type="hidden" value={moment.planet.slug} /><input name="momentId" type="hidden" value={moment.id} /><input className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none" maxLength={1000} name="content" placeholder="说点什么..." required /><button className="rounded-full bg-[#246c4b] p-2 text-white"><Send className="h-4 w-4" /></button></form> : null}</section></section></PageShell>;
}

export function PlanetMomentPage({ locale, moment }: { locale: string; moment: PlanetMoment }) {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl">
        <header className="flex items-center gap-3"><Link aria-label="返回星球房间" href={withLocale(locale, `/planets/${moment.planet.slug}`)}><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="text-sm font-black">{getPlanetName(moment.planet, locale)}</h1><p className="text-[10px] text-[#778178]">精彩瞬间</p></div></header>
        <article className="mt-4 rounded-2xl bg-white p-3 shadow-sm">
          {moment.imageUrls.length ? <div className={`grid gap-1 overflow-hidden rounded-xl ${moment.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{moment.imageUrls.slice(0, 4).map((imageUrl, index) => <img alt="星球精彩瞬间" className={`h-32 w-full object-cover ${moment.imageUrls.length === 3 && index === 0 ? "row-span-2 h-full" : ""}`} key={`${imageUrl}-${index}`} src={imageUrl} style={{ objectPosition: `${30 + index * 20}% center` }} />)}</div> : <div className="flex h-48 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#e9d6bb,#b78964)] text-5xl">🪐</div>}
          <div className="mt-4 flex items-center gap-2"><Avatar avatarUrl={moment.author.avatarUrl} name={moment.author.nickname} /><div><p className="text-sm font-black">{moment.author.nickname}</p><p className="text-[11px] text-[#7d877e]">{moment.createdAt.toLocaleDateString()}</p></div></div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{moment.content}</p>
          {moment.isViewerAuthor ? <form action={deletePlanetMomentAction} className="mt-2"><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={moment.planet.id} /><input name="planetSlug" type="hidden" value={moment.planet.slug} /><input name="momentId" type="hidden" value={moment.id} /><button className="inline-flex items-center gap-1 text-xs font-bold text-[#b4473c]" type="submit"><Trash2 className="h-3.5 w-3.5" />删除</button></form> : null}
          <form action={togglePlanetMomentLikeAction} className="mt-3"><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={moment.planet.id} /><input name="planetSlug" type="hidden" value={moment.planet.slug} /><input name="momentId" type="hidden" value={moment.id} /><button aria-label="点赞" className={`inline-flex items-center gap-1 text-sm font-bold ${(moment.likes?.length ?? 0) ? "text-[#ba4439]" : "text-[#718075]"}`}><Heart className={`h-4 w-4 ${(moment.likes?.length ?? 0) ? "fill-current" : ""}`} />{(moment._count?.likes ?? 0) || null}</button></form>
        </article>
        <section className="mt-5"><h2 className="text-sm font-black">评论 {moment.comments.length}</h2><div className="mt-3 space-y-3">{moment.comments.map((comment) => <div className="flex gap-2" key={comment.id}><Avatar avatarUrl={comment.author.avatarUrl} name={comment.author.nickname} /><div><p className="text-xs font-black">{comment.author.nickname}</p><p className="text-sm">{comment.content}</p></div></div>)}</div>{moment.viewerMembership ? <form action={createPlanetMomentCommentAction} className="mt-4 flex gap-2"><input name="locale" type="hidden" value={locale} /><input name="planetId" type="hidden" value={moment.planet.id} /><input name="planetSlug" type="hidden" value={moment.planet.slug} /><input name="momentId" type="hidden" value={moment.id} /><input className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none" maxLength={1000} name="content" placeholder="说点什么..." required /><button aria-label="发送评论" className="rounded-full bg-[#246c4b] p-2 text-white"><Send className="h-4 w-4" /></button></form> : null}</section>
      </section>
    </PageShell>
  );
}

export function PlanetCreatePage({ locale }: { locale: string }) {
  return <PageShell><section className="mx-auto w-full max-w-md px-4 md:rounded-[2rem] md:bg-[#fffefb] md:py-6 md:shadow-xl"><Link className="inline-flex items-center gap-2 text-sm font-bold" href={withLocale(locale, "/planets")}><ArrowLeft className="h-5 w-5" />返回星球</Link><div className="mt-6 rounded-3xl bg-[linear-gradient(135deg,#163250,#3c6e75)] p-6 text-center text-white"><Orbit className="mx-auto h-12 w-12" /><h1 className="mt-2 text-xl font-black">创建你的星球</h1><p className="mt-1 text-xs text-white/75">让兴趣、关系和灵感在这里相遇</p></div><form action={createPlanetAction} className="mt-5 space-y-4"><input name="locale" type="hidden" value={locale} /><label className="block text-sm font-bold">星球名称<input className="mt-2 w-full rounded-xl border border-[#dfdbcf] px-3 py-3 font-normal outline-none" maxLength={60} minLength={2} name="name" placeholder="例如：周末桌游星球" required /></label><label className="block text-sm font-bold">星球介绍<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#dfdbcf] px-3 py-3 font-normal outline-none" maxLength={500} name="description" placeholder="告诉大家这个星球会发生什么" /></label><label className="block text-sm font-bold">标签<input className="mt-2 w-full rounded-xl border border-[#dfdbcf] px-3 py-3 font-normal outline-none" maxLength={160} name="tags" placeholder="桌游，周末，新手友好" /></label><ActivityCoverUpload label="星球封面" locale={locale} name="coverImageUrl" uploadEndpoint="/api/uploads/activity-cover" /><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246c4b] py-3 font-black text-white"><UsersRound className="h-4 w-4" />创建并进入星球</button></form></section></PageShell>;
}
