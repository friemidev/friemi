import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  EllipsisVertical,
  Heart,
  Mic,
  Orbit,
  Plus,
  Search,
  Send,
  Smile,
} from "lucide-react";
import { withLocale } from "@/lib/routes";

type PlanetSquareMobilePageProps = {
  locale: string;
};

type PlanetRoomMobilePageProps = {
  locale: string;
  planetSlug: string;
};

type PlanetMomentMobilePageProps = {
  locale: string;
  planetSlug: string;
  momentSlug: string;
};

type PlanetCreateMobilePageProps = {
  locale: string;
};

type PlanetCard = {
  slug: string;
  title: string;
  members: number;
  storyLabel: string;
  momentTitle: string;
  sky: string;
  planet: string;
  accent: string;
};

const planetCards: PlanetCard[] = [
  {
    slug: "board-game-planet",
    title: "Board Game Planet",
    members: 326,
    storyLabel: "桌游之夜",
    momentTitle: "桌游之夜回顾",
    sky: "from-[#173253] via-[#213f68] to-[#365d8b]",
    planet: "bg-[#8f97f6]",
    accent: "bg-[#f4bd93]",
  },
  {
    slug: "music-vibes",
    title: "Music Vibes",
    members: 532,
    storyLabel: "聚会音乐",
    momentTitle: "音乐夜精彩瞬间",
    sky: "from-[#172d57] via-[#3a2b6e] to-[#5e3f8a]",
    planet: "bg-[#d65b8b]",
    accent: "bg-[#ffd39a]",
  },
  {
    slug: "outdoor-club",
    title: "Outdoor Club",
    members: 412,
    storyLabel: "露营之旅",
    momentTitle: "露营之旅回顾",
    sky: "from-[#537e8f] via-[#86adb2] to-[#b6d0cb]",
    planet: "bg-[#f0d07e]",
    accent: "bg-[#e8f1bf]",
  },
  {
    slug: "food-lovers",
    title: "Food Lovers",
    members: 276,
    storyLabel: "生日派对",
    momentTitle: "生日饭局瞬间",
    sky: "from-[#e28953] via-[#f0a96d] to-[#f8c78c]",
    planet: "bg-[#fff1dd]",
    accent: "bg-[#f09352]",
  },
  {
    slug: "study-planet",
    title: "Study Planet",
    members: 189,
    storyLabel: "学习搭子",
    momentTitle: "共学房间记录",
    sky: "from-[#3e6880] via-[#5c8799] to-[#89b4c2]",
    planet: "bg-[#f6e2ae]",
    accent: "bg-[#d7edf4]",
  },
  {
    slug: "anime-world",
    title: "Anime World",
    members: 245,
    storyLabel: "动漫夜",
    momentTitle: "动漫夜回放",
    sky: "from-[#27355b] via-[#514279] to-[#6e5ba1]",
    planet: "bg-[#e8d7ff]",
    accent: "bg-[#b993ec]",
  },
];

const chatMessages = [
  {
    name: "Kevin",
    time: "16:25",
    text: "大家周末来不来桌游房第二局？🍻",
    avatar: "bg-[linear-gradient(145deg,#d9a77d,#8f6048)]",
  },
  {
    name: "Chloe",
    time: "16:26",
    text: "好呀！我把新手指引改完啦～",
    avatar: "bg-[linear-gradient(145deg,#f4c39d,#db7f72)]",
  },
  {
    name: "Tom",
    time: "16:28",
    voice: "32''",
    avatar: "bg-[linear-gradient(145deg,#b98b69,#72513d)]",
  },
  {
    name: "Amy",
    time: "16:29",
    text: "期待期待！🔥",
    avatar: "bg-[linear-gradient(145deg,#f4d0af,#d38877)]",
  },
];

const momentReplies = [
  {
    name: "Chloe",
    text: "这次的游戏太开心了！下次再约～",
    likes: 12,
    avatar: "bg-[linear-gradient(145deg,#f4c39d,#db7f72)]",
  },
  {
    name: "Amy",
    text: "招新节奏好！想去下一次 😍",
    likes: 5,
    avatar: "bg-[linear-gradient(145deg,#f4d0af,#d38877)]",
  },
  {
    name: "Kevin",
    text: "线下认识新朋友也挺不错的！",
    likes: 3,
    avatar: "bg-[linear-gradient(145deg,#d9a77d,#8f6048)]",
  },
];

function getPlanet(slug: string) {
  return planetCards.find((planet) => planet.slug === slug) ?? planetCards[0];
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[392px] rounded-[28px] bg-[#fffefb] px-4 pb-4 shadow-[0_20px_46px_rgba(17,18,16,0.08)]">
      {children}
    </div>
  );
}

function PlanetPoster({ planet }: { planet: PlanetCard }) {
  return (
    <div
      className={`relative h-[88px] overflow-hidden rounded-[12px] bg-gradient-to-br ${planet.sky}`}
    >
      <span className="absolute left-3 top-3 h-1 w-1 rounded-full bg-white/80" />
      <span className="absolute left-8 top-5 h-1.5 w-1.5 rounded-full bg-white/70" />
      <span className="absolute right-6 top-4 h-1 w-1 rounded-full bg-white/80" />
      <span className="absolute right-12 top-8 h-1 w-1 rounded-full bg-white/60" />
      <span
        className={`absolute bottom-3 left-4 h-10 w-10 rounded-full shadow-[inset_-6px_-6px_0_rgba(255,255,255,0.12)] ${planet.planet}`}
      />
      <span className="absolute bottom-5 left-11 h-3 w-5 rounded-full border border-white/60" />
      <span
        className={`absolute bottom-4 right-5 h-3 w-3 rounded-full ${planet.accent}`}
      />
      <span className="absolute inset-x-0 bottom-0 h-6 bg-[linear-gradient(180deg,transparent,rgba(12,16,26,0.12)_45%,rgba(12,16,26,0.25))]" />
    </div>
  );
}

function PlanetAvatar({
  planet,
  active = false,
}: {
  planet: PlanetCard;
  active?: boolean;
}) {
  return (
    <div
      className={`relative h-[54px] w-[54px] rounded-full p-[2px] ${
        active ? "bg-[#f49b74]" : "bg-[#e9dfd6]"
      }`}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br ${planet.sky}`}
      >
        <span className="absolute left-3 top-3 h-1 w-1 rounded-full bg-white/80" />
        <span
          className={`absolute bottom-2 left-2 h-6 w-6 rounded-full ${planet.planet}`}
        />
        <span className="absolute bottom-3 left-7 h-2 w-3 rounded-full border border-white/60" />
      </div>
    </div>
  );
}

export function PlanetSquareMobilePage({
  locale,
}: PlanetSquareMobilePageProps) {
  return (
    <main className="mobile-v23-planets min-h-[100svh] bg-[#f6f1ea] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-[#111210] md:bg-[#eef4fb] md:py-10">
      <PhoneFrame>
        <div className="flex h-8 items-center text-[11px] font-semibold text-[#111210]">
          9:41
        </div>
        <header className="mt-1 flex items-center gap-2">
          <span className="text-[13px]">✨</span>
          <div>
            <p className="text-[17px] font-black text-[#2d6c50]">星际之间</p>
            <p className="text-[11px] font-semibold text-[#8d8f85]">汇聚你所想象</p>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {planetCards.map((planet) => (
            <Link
              key={planet.slug}
              href={withLocale(locale, `/planets/${planet.slug}`)}
            >
              <article className="rounded-[16px] bg-white p-2.5 shadow-[0_8px_18px_rgba(17,18,16,0.05)] ring-1 ring-[#efe8de]">
                <PlanetPoster planet={planet} />
                <div className="mt-2">
                  <p className="text-[13px] font-bold leading-4 text-[#22211d]">
                    {planet.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[#8b8d86]">
                    {planet.members} 成员
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </section>

        <Link
          href={withLocale(locale, "/planets/create")}
          className="mt-4 flex min-h-[90px] items-center justify-center gap-3 rounded-[18px] border border-dashed border-[#ddd4c9] bg-white text-[#2d6c50] shadow-[0_8px_18px_rgba(17,18,16,0.04)]"
        >
          <Plus className="h-8 w-8 stroke-[2.5]" />
          <div className="text-left">
            <p className="text-[18px] font-black leading-5">创建星球</p>
            <p className="mt-1 text-[12px] font-semibold text-[#7f8d82]">星球聚变</p>
          </div>
        </Link>
      </PhoneFrame>
    </main>
  );
}

export function PlanetRoomMobilePage({
  locale,
  planetSlug,
}: PlanetRoomMobilePageProps) {
  const planet = getPlanet(planetSlug);

  return (
    <main className="mobile-v23-planets-room min-h-[100svh] bg-[#f6f1ea] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-[#111210] md:bg-[#eef4fb] md:py-10">
      <PhoneFrame>
        <div className="flex h-8 items-center text-[11px] font-semibold text-[#111210]">
          9:41
        </div>
        <header className="mt-1 flex items-center gap-2">
          <Link
            href={withLocale(locale, "/planets")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#111210]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PlanetAvatar planet={planet} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-black text-[#22211d]">
              {planet.title}
            </p>
            <p className="text-[11px] text-[#8b8d86]">{planet.members} 成员</p>
          </div>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center">
            <Search className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center">
            <EllipsisVertical className="h-4 w-4" />
          </button>
        </header>

        <section className="mt-4">
          <p className="text-[12px] font-black text-[#2d6c50]">星球轨迹</p>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {planetCards.slice(0, 5).map((item) => (
              <Link
                key={item.slug}
                href={withLocale(
                  locale,
                  `/planets/${planetSlug}/moments/${item.slug}`,
                )}
                className="flex w-[58px] shrink-0 flex-col items-center"
              >
                <PlanetAvatar planet={item} active={item.slug === planetSlug} />
                <span className="mt-1 line-clamp-2 text-center text-[10px] font-semibold leading-3 text-[#b66757]">
                  {item.storyLabel}
                </span>
              </Link>
            ))}
            <div className="flex w-[58px] shrink-0 flex-col items-center">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#f3eee7] ring-2 ring-[#e9dfd6]">
                <Compass className="h-4 w-4 text-[#b66757]" />
              </div>
              <span className="mt-1 text-center text-[10px] font-semibold text-[#b66757]">
                更多
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <p className="text-[12px] font-black text-[#2d6c50]">星球轨迹</p>
          <div className="mt-2 space-y-3">
            {chatMessages.map((message) => (
              <article
                key={`${message.name}-${message.time}`}
                className="flex gap-2.5"
              >
                <div className={`mt-0.5 h-8 w-8 rounded-full ${message.avatar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-[#22211d]">
                      {message.name}
                    </p>
                    <span className="text-[11px] text-[#aaa9a1]">
                      {message.time}
                    </span>
                  </div>
                  {"voice" in message ? (
                    <div className="mt-1 inline-flex h-9 items-center gap-2 rounded-full bg-[#f3f2ef] px-4 text-[13px] text-[#6d6f69]">
                      <Mic className="h-4 w-4 text-[#2d6c50]" />
                      {message.voice}
                    </div>
                  ) : (
                    <p className="mt-1 text-[13px] leading-5 text-[#4c4c46]">
                      {message.text}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-[#e8e0d6] bg-white px-3 py-2 shadow-[0_6px_16px_rgba(17,18,16,0.04)]">
          <input
            readOnly
            value=""
            placeholder="输入消息..."
            className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[#111210] outline-none placeholder:text-[#b7b4ad]"
          />
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-[#85857c]">
            <Smile className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-[#85857c]">
            <Mic className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1c7a54] text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </PhoneFrame>
    </main>
  );
}

export function PlanetMomentMobilePage({
  locale,
  planetSlug,
  momentSlug,
}: PlanetMomentMobilePageProps) {
  const planet = getPlanet(planetSlug);
  const momentPlanet = getPlanet(momentSlug);

  return (
    <main className="mobile-v23-planets-moment min-h-[100svh] bg-[#f6f1ea] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-[#111210] md:bg-[#eef4fb] md:py-10">
      <PhoneFrame>
        <div className="flex h-8 items-center text-[11px] font-semibold text-[#111210]">
          9:41
        </div>
        <header className="mt-1 flex items-center gap-2">
          <Link
            href={withLocale(locale, `/planets/${planetSlug}`)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#111210]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-black text-[#22211d]">
              {momentPlanet.momentTitle}
            </p>
            <p className="text-[11px] text-[#8b8d86]">{planet.title} · 05:25</p>
          </div>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center">
            <EllipsisVertical className="h-4 w-4" />
          </button>
        </header>

        <section className="mt-4 grid h-[182px] grid-cols-[1.06fr_0.94fr] gap-2 rounded-[18px] bg-white p-2 shadow-[0_10px_22px_rgba(17,18,16,0.05)]">
          <div className="rounded-[14px] bg-[linear-gradient(145deg,#3f2f28,#7c5842_60%,#b28e70)]" />
          <div className="grid gap-2">
            <div className="rounded-[14px] bg-[linear-gradient(145deg,#5a4638,#8f684e_60%,#c1a183)]" />
            <div className="rounded-[14px] bg-[linear-gradient(145deg,#4a382f,#7c5b49_60%,#ad8a70)]" />
          </div>
        </section>

        <section className="mt-4 space-y-4">
          {momentReplies.map((reply) => (
            <article key={reply.name} className="flex items-start gap-2.5">
              <div className={`mt-0.5 h-8 w-8 rounded-full ${reply.avatar}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#22211d]">{reply.name}</p>
                <p className="mt-1 text-[13px] leading-5 text-[#4c4c46]">{reply.text}</p>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-[#7fa38d]">
                <Heart className="h-4 w-4" />
                {reply.likes}
              </div>
            </article>
          ))}
        </section>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-[#e8e0d6] bg-white px-3 py-2 shadow-[0_6px_16px_rgba(17,18,16,0.04)]">
          <input
            readOnly
            value=""
            placeholder="说点什么..."
            className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[#111210] outline-none placeholder:text-[#b7b4ad]"
          />
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-[#85857c]">
            <Smile className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center text-[#85857c]">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </PhoneFrame>
    </main>
  );
}

export function PlanetCreateMobilePage({
  locale,
}: PlanetCreateMobilePageProps) {
  return (
    <main className="mobile-v23-planets min-h-[100svh] bg-[#f6f1ea] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-[#111210] md:bg-[#eef4fb] md:py-10">
      <PhoneFrame>
        <div className="flex h-8 items-center text-[11px] font-semibold text-[#111210]">
          9:41
        </div>
        <header className="mt-1 flex items-center gap-2">
          <Link
            href={withLocale(locale, "/planets")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#111210]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-black text-[#22211d]">创建星球</p>
            <p className="text-[11px] text-[#8b8d86]">星球聚变</p>
          </div>
        </header>

        <section className="mt-4 rounded-[18px] bg-white p-4 shadow-[0_10px_22px_rgba(17,18,16,0.05)]">
          <div className="rounded-[16px] border border-dashed border-[#ddd4c9] bg-[#faf7f2] px-4 py-8 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf4ee] text-[#2d6c50]">
              <Plus className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#2d6c50]">上传星球封面</p>
          </div>

          <div className="mt-4 space-y-3">
            <PlanetField label="星球名称" value="Board Game Planet" />
            <PlanetField label="一句介绍" value="把喜欢同一种氛围的人聚在一起" />
            <PlanetField label="星球标签" value="桌游 / 新手友好 / 周末局" />
            <PlanetField label="开放方式" value="公开加入" />
          </div>

          <Link
            href={withLocale(locale, "/planets/board-game-planet")}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1c7a54] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(28,122,84,0.18)]"
          >
            创建并进入星球
          </Link>
        </section>
      </PhoneFrame>
    </main>
  );
}

function PlanetField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <p className="mb-2 text-[12px] font-bold text-[#2d6c50]">{label}</p>
      <div className="rounded-[14px] border border-[#ebe2d7] bg-[#fffefb] px-4 py-3 text-sm text-[#5d5c54]">
        {value}
      </div>
    </label>
  );
}
