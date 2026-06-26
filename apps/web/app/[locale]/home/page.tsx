import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  Gem,
  Layers3,
  PenLine,
} from "lucide-react";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { HomeActivityCarousel } from "@/features/home/components/HomeActivityCarousel";
import { HomeLuxuryMotion } from "@/features/home/components/HomeLuxuryMotion";
import { getUpcomingHomeActivities } from "@/features/activities/queries/getActivities";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  generalPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type LuxuryHomeCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  primaryCta: string;
  secondaryCta: string;
  heroNotes: string[];
  introEyebrow: string;
  introTitle: string;
  introDescription: string;
  valueEyebrow: string;
  valueTitle: string;
  valueDescription: string;
  valueImageCaption: string;
  values: {
    body: string;
    title: string;
  }[];
  activityEyebrow: string;
  activityTitle: string;
  activityDescription: string;
  carousel: {
    ariaLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    next: string;
    previous: string;
    viewActivity: string;
  };
  ipEyebrow: string;
  ipTitle: string;
  ipLead: string;
  ipLines: string[];
  identityEyebrow: string;
  identityTitle: string;
  identityDescription: string;
  identityBenefits: string[];
};

const homeActivityPreviewLimit = 8;

const homeMedia = {
  heroMobile: "/home/v2_1/friemi-home-v21-hero-city-gathering-mobile.jpg",
  heroVideo: "/home/v2_1/friemi-home-v21-hero-city-gathering.mp4",
  creatorHosting: "/home/v2_1/friemi-home-v21-creator-hosting.jpg",
  friendsArrival: "/home/v2_1/friemi-home-v21-friends-arrival.jpg",
  eventsMood: "/home/v2_1/friemi-home-v21-events-mood.jpg",
  creatorIdentity: "/home/v2_1/friemi-home-v21-creator-identity.jpg",
} as const;

const luxuryHomeCopy: Record<string, LuxuryHomeCopy> = {
  "zh-CN": {
    heroEyebrow: "Friemi Co-Creators",
    heroTitle: "让零散的小局，变成可积累的活动社群。",
    heroDescription:
      "Friemi 帮助主理人更好转发活动、管理报名、沉淀参与者关系，并把个人 IP 变成更清晰的主理人品牌。",
    primaryCta: "成为共创主理人",
    secondaryCta: "先看看活动",
    heroNotes: ["好转发", "易报名", "能沉淀"],
    introEyebrow: "A social ritual, not another form",
    introTitle:
      "你负责把大家聚在一起，Friemi 负责让这件事看起来更清楚、更可信、更容易被记住。",
    introDescription:
      "每一次读书会、桌游局、city walk 或展览同行，都可以从一段群消息，变成一个可传播、可复用、可沉淀的活动入口。",
    valueEyebrow: "The host journey",
    valueTitle: "把主理人的日常工作，整理成一条更轻的路径。",
    valueDescription:
      "首页先保留六个最核心的价值点，用短句和节奏帮助用户快速理解，不把招募页内容整页搬过来。",
    valueImageCaption: "从发起、报名到复用，主理人的每一步都应该更轻。",
    values: [
      {
        title: "好转发",
        body: "活动链接清晰完整，适合分享到微信群、朋友圈、小红书和 Instagram。",
      },
      {
        title: "更专业",
        body: "时间、地点、人数、费用和规则统一展示，参与者一眼看懂。",
      },
      {
        title: "易报名",
        body: "减少私聊、接龙和人工统计，更方便收集与管理参与者。",
      },
      {
        title: "易复用",
        body: "长期活动不必每次从零开始，下一次组局可以自然延续。",
      },
      {
        title: "能沉淀",
        body: "每一次活动都留下记录、常客和关系，而不是一次性消耗。",
      },
      {
        title: "强 IP",
        body: "持续发布活动后，别人更容易记住你的主题、风格和信任感。",
      },
    ],
    activityEyebrow: "Live from Friemi",
    activityTitle: "从一次小局开始",
    activityDescription:
      "让招募叙事中间停下来，看见平台上正在发生的真实活动。卡片保持轻量，只承担浏览和跳转。",
    carousel: {
      ariaLabel: "首页精选活动轮播",
      emptyTitle: "近期活动正在整理中",
      emptyDescription: "有新的未开始活动后会显示在这里。",
      next: "下一组活动",
      previous: "上一组活动",
      viewActivity: "查看详情",
    },
    ipEyebrow: "Personal IP",
    ipTitle: "别人会更容易记住你是谁。",
    ipLead:
      "FRIEMI 帮你把零散印象沉淀成一个更清晰、更专业、更容易传播的个人品牌。",
    ipLines: [
      "你是那个长期组织读书会的人。",
      "你是那个经常办高质量桌游局的人。",
      "你是那个很会组织城市散步和探店活动的人。",
      "你是那个能把大家聚在一起的人。",
    ],
    identityEyebrow: "Early co-creator identity",
    identityTitle: "拥有平台共创身份，不只是多一个标签。",
    identityDescription:
      "早期认证、优先展示、产品共创和未来合作机会，会让认真组织活动的人更早被看见。",
    identityBenefits: ["早期认证", "优先展示", "产品共创", "未来合作"],
  },
  en: {
    heroEyebrow: "Friemi Co-Creators",
    heroTitle: "Turn scattered plans into a community people remember.",
    heroDescription:
      "Friemi helps hosts share events clearly, manage signups, build returning relationships, and shape a sharper personal brand.",
    primaryCta: "Become a co-creator",
    secondaryCta: "Browse activities",
    heroNotes: ["Easy to share", "Easy to join", "Built to last"],
    introEyebrow: "A social ritual, not another form",
    introTitle:
      "You bring people together. Friemi makes that moment clearer, more trusted, and easier to remember.",
    introDescription:
      "Book clubs, board game nights, city walks, exhibitions, and small dinners can move beyond group-chat text into a reusable activity page.",
    valueEyebrow: "The host journey",
    valueTitle: "A lighter path for the work hosts already do.",
    valueDescription:
      "The homepage keeps the six sharpest value points up front, with short editorial rhythm instead of dense feature copy.",
    valueImageCaption:
      "From sharing to signups to reuse, every hosting step should feel lighter.",
    values: [
      {
        title: "Shareable",
        body: "A clear activity link works across WeChat, Moments, Xiaohongshu, Instagram, and group chats.",
      },
      {
        title: "Professional",
        body: "Time, place, capacity, price, rules, and signup details live in one trusted place.",
      },
      {
        title: "Easy signup",
        body: "Less back-and-forth messaging, fewer spreadsheets, and simpler participant management.",
      },
      {
        title: "Reusable",
        body: "Recurring activities do not need to restart from zero each time.",
      },
      {
        title: "Compounding",
        body: "Every event can leave records, regulars, and social context behind.",
      },
      {
        title: "Personal IP",
        body: "Consistent hosting makes your theme, taste, and reliability easier to recognize.",
      },
    ],
    activityEyebrow: "Live from Friemi",
    activityTitle: "Start with one gathering",
    activityDescription:
      "A calm pause in the story: real activities from the platform, styled for browsing rather than hard selling.",
    carousel: {
      ariaLabel: "Featured activities carousel",
      emptyTitle: "Activities are being curated",
      emptyDescription: "Upcoming activities will appear here.",
      next: "Next activities",
      previous: "Previous activities",
      viewActivity: "View details",
    },
    ipEyebrow: "Personal IP",
    ipTitle: "People remember what you bring together.",
    ipLead:
      "Friemi turns loose impressions into a clearer, more professional, and more shareable host identity.",
    ipLines: [
      "You are the person who keeps a book club alive.",
      "You are the person who hosts thoughtful board game nights.",
      "You are the person who knows the best city walks and gallery days.",
      "You are the person who gathers people well.",
    ],
    identityEyebrow: "Early co-creator identity",
    identityTitle: "A platform identity that is more than a badge.",
    identityDescription:
      "Early verification, priority exposure, product co-creation, and future collaborations help serious hosts get seen earlier.",
    identityBenefits: [
      "Early verification",
      "Priority exposure",
      "Product co-creation",
      "Future collaboration",
    ],
  },
  fr: {
    heroEyebrow: "Friemi Co-Creators",
    heroTitle: "Transformez de petits rendez-vous en communaute durable.",
    heroDescription:
      "Friemi aide les organisateurs a mieux partager leurs sorties, gerer les inscriptions, garder le lien et construire une image plus claire.",
    primaryCta: "Devenir co-createur",
    secondaryCta: "Voir les activites",
    heroNotes: ["Facile a partager", "Facile a rejoindre", "Fait pour durer"],
    introEyebrow: "A social ritual, not another form",
    introTitle:
      "Vous rassemblez les gens. Friemi rend ce moment plus clair, plus fiable et plus memorable.",
    introDescription:
      "Clubs de lecture, jeux de societe, balades urbaines, expositions ou diners peuvent devenir une page d'activite reutilisable.",
    valueEyebrow: "The host journey",
    valueTitle: "Un chemin plus leger pour le travail deja fait par les hotes.",
    valueDescription:
      "La page d'accueil garde les six benefices les plus importants, avec un rythme editorial court et lisible.",
    valueImageCaption:
      "Du partage aux inscriptions puis a la reutilisation, chaque etape doit etre plus legere.",
    values: [
      {
        title: "Partage clair",
        body: "Un lien complet se partage mieux sur WeChat, Moments, Instagram et les groupes.",
      },
      {
        title: "Plus pro",
        body: "Horaire, lieu, places, prix, regles et inscription sont reunis au meme endroit.",
      },
      {
        title: "Inscription simple",
        body: "Moins de messages prives, moins de listes manuelles, plus de controle.",
      },
      {
        title: "Reutilisable",
        body: "Les rendez-vous recurrents ne repartent pas de zero a chaque fois.",
      },
      {
        title: "Memoire",
        body: "Chaque activite laisse une trace, des habitues et du contexte social.",
      },
      {
        title: "Image personnelle",
        body: "Organiser regulierement rend votre theme et votre style plus reconnaissables.",
      },
    ],
    activityEyebrow: "Live from Friemi",
    activityTitle: "Commencer par une sortie",
    activityDescription:
      "Une pause dans le recit avec de vraies activites de la plateforme, pensees pour explorer sans forcer.",
    carousel: {
      ariaLabel: "Carrousel d'activites selectionnees",
      emptyTitle: "Les activites sont en preparation",
      emptyDescription: "Les prochaines activites apparaitront ici.",
      next: "Activites suivantes",
      previous: "Activites precedentes",
      viewActivity: "Voir le detail",
    },
    ipEyebrow: "Personal IP",
    ipTitle: "On retient mieux ce que vous rassemblez.",
    ipLead:
      "Friemi transforme des impressions dispersees en une identite d'organisateur plus claire, plus professionnelle et plus partageable.",
    ipLines: [
      "Vous etes la personne qui fait vivre un club de lecture.",
      "Vous etes la personne qui organise de bonnes soirees jeux.",
      "Vous etes la personne qui connait les balades et expos a faire.",
      "Vous etes la personne qui sait rassembler.",
    ],
    identityEyebrow: "Early co-creator identity",
    identityTitle: "Une identite de plateforme, pas seulement un badge.",
    identityDescription:
      "Certification initiale, mise en avant, co-creation produit et futures collaborations aident les organisateurs serieux a etre vus plus tot.",
    identityBenefits: [
      "Certification initiale",
      "Mise en avant",
      "Co-creation produit",
      "Collaborations futures",
    ],
  },
};

function getLuxuryHomeCopy(locale: string) {
  return luxuryHomeCopy[locale] ?? luxuryHomeCopy["zh-CN"];
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getLuxuryHomeCopy(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: generalPageShareDescription,
    path: withLocale(locale, "/home"),
    title: `Friemi · ${t.heroTitle}`,
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = getLuxuryHomeCopy(locale);
  const perf = createPerformanceTracker({
    locale,
    route: "/home",
  });
  const activitiesResult = await perf.measure("home.activities", () =>
    getUpcomingHomeActivities({
      limit: homeActivityPreviewLimit,
    })
      .then((activities) => ({ activities, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load home activities", error);
        return { activities: [], error };
      }),
  );

  perf.finish({
    activityCount: activitiesResult.activities.length,
    hasActivityError: Boolean(activitiesResult.error),
    previewLimit: homeActivityPreviewLimit,
  });

  return (
    <>
      <HomeLuxuryMotion />
      <DetailSourceRestore sourceKey="home" />
      <main className="overflow-hidden bg-[#f6efe3] text-[#21170f]">
        <section className="relative isolate min-h-[calc(68vh-4rem)] overflow-hidden bg-[#17110c] text-white md:min-h-[calc(100vh-4rem)]">
          <video
            className="home-luxury-hero-media absolute inset-0 hidden h-full w-full object-cover md:block"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src={homeMedia.heroVideo} type="video/mp4" />
          </video>
          <Image
            src={homeMedia.heroMobile}
            alt=""
            fill
            priority
            sizes="100vw"
            className="home-luxury-hero-media object-cover md:hidden"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,10,6,0.76),rgba(15,10,6,0.38)_45%,rgba(15,10,6,0.12)),linear-gradient(180deg,rgba(15,10,6,0.2),rgba(15,10,6,0.72))]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#17110c] to-transparent" />

          <div className="relative z-10 mx-auto flex min-h-[calc(68vh-4rem)] w-full max-w-7xl flex-col justify-end px-5 pb-9 pt-16 sm:px-6 md:min-h-[calc(100vh-4rem)] md:px-8 md:pb-16 lg:px-10">
            <div className="home-luxury-reveal max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                {t.heroEyebrow}
              </p>
              <h1 className="mt-5 max-w-3xl font-serif text-[2.35rem] leading-[1.02] tracking-normal text-white min-[390px]:text-[2.55rem] sm:text-6xl md:text-7xl lg:text-[5.8rem]">
                {t.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/78 sm:mt-6 sm:text-lg md:text-xl md:leading-8">
                {t.heroDescription}
              </p>
              <div className="mt-7 grid max-w-md grid-cols-2 gap-2 sm:mt-8 sm:flex sm:max-w-none sm:gap-3">
                <Link
                  href={withLocale(locale, "/co-creators")}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#1e140e] shadow-[0_18px_54px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#fff6e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:min-h-12 sm:gap-2 sm:px-6 sm:text-sm"
                >
                  {t.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href={withLocale(locale, "/activities")}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/32 bg-white/10 px-3 text-xs font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/55 sm:min-h-12 sm:gap-2 sm:px-6 sm:text-sm"
                >
                  {t.secondaryCta}
                  <Compass className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="home-luxury-reveal mt-7 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/76 sm:mt-10 sm:text-xs">
              {t.heroNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 backdrop-blur"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-5 py-16 sm:px-6 md:py-28 lg:px-8">
          <div
            className="mx-auto max-w-4xl text-center"
            data-home-reveal="up"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8c6a4b]">
              {t.introEyebrow}
            </p>
            <h2 className="mt-5 font-serif text-[2rem] leading-tight text-[#21170f] sm:text-5xl">
              {t.introTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-8 text-[#6b5d51] sm:mt-6 sm:text-lg">
              {t.introDescription}
            </p>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-6 md:pb-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
            <div
              className="lg:sticky lg:top-24 lg:self-start"
              data-home-reveal="left"
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-[#21170f] shadow-[0_30px_90px_rgba(64,46,31,0.16)]">
                <Image
                  src={homeMedia.creatorHosting}
                  alt=""
                  width={1600}
                  height={1100}
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="aspect-[4/3] h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-transparent to-transparent" />
                <p className="absolute inset-x-0 bottom-0 p-6 text-sm leading-6 text-white/82 sm:p-7">
                  {t.valueImageCaption}
                </p>
              </div>
            </div>

            <div className="self-center">
              <div className="max-w-2xl" data-home-reveal="right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8c6a4b]">
                  {t.valueEyebrow}
                </p>
                <h2 className="mt-4 font-serif text-[2rem] leading-tight text-[#21170f] sm:text-5xl">
                  {t.valueTitle}
                </h2>
                <p className="mt-4 text-[15px] leading-8 text-[#6b5d51] sm:mt-5 sm:text-base">
                  {t.valueDescription}
                </p>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:block sm:divide-y sm:divide-[#d9c7ad] sm:border-y sm:border-[#d9c7ad]">
                {t.values.map((item, index) => (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-[#ddc9aa] bg-white/20 p-4 transition hover:bg-white/30 sm:grid sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:py-5 sm:grid-cols-[5rem_1fr] sm:gap-4"
                    data-home-reveal="up"
                    style={
                      {
                        "--home-reveal-delay": `${index * 70}ms`,
                      } as CSSProperties
                    }
                  >
                    <span className="font-serif text-xl text-[#b87555] sm:text-3xl">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="mt-2 text-base font-semibold text-[#21170f] sm:mt-0 sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-xs leading-6 text-[#6b5d51] sm:text-base sm:leading-7">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative bg-[#eadccb] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="absolute inset-0 opacity-[0.13]">
            <Image
              src={homeMedia.eventsMood}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.32fr_minmax(0,0.68fr)] lg:items-center">
            <div data-home-reveal="left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8c6a4b]">
                {t.activityEyebrow}
              </p>
              <h2 className="mt-4 font-serif text-[2.15rem] leading-tight text-[#21170f] sm:text-5xl">
                {t.activityTitle}
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-8 text-[#6b5d51] sm:mt-5 sm:text-base">
                {t.activityDescription}
              </p>
              <Link
                href={withLocale(locale, "/activities")}
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#caaa84] bg-[#fffaf2]/78 px-4 text-sm font-semibold text-[#60432f] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c28a62]/40"
              >
                {t.secondaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="min-w-0" data-home-reveal="slide-right">
              <HomeActivityCarousel
                activities={activitiesResult.activities}
                labels={t.carousel}
                locale={locale}
              />
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 md:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.48fr_0.52fr] lg:items-center lg:gap-16">
            <div
              className="relative overflow-hidden rounded-[2rem] bg-[#21170f] shadow-[0_30px_90px_rgba(64,46,31,0.14)]"
              data-home-reveal="left"
            >
              <Image
                src={homeMedia.friendsArrival}
                alt=""
                width={1100}
                height={1600}
                sizes="(min-width: 1024px) 43vw, 100vw"
                className="aspect-[4/5] h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/46 via-transparent to-transparent" />
            </div>

            <div data-home-reveal="right">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8c6a4b]">
                {t.ipEyebrow}
              </p>
              <h2 className="mt-4 font-serif text-[2.15rem] leading-tight text-[#21170f] sm:text-5xl">
                {t.ipTitle}
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-8 text-[#6b5d51] sm:mt-5 sm:text-lg">
                {t.ipLead}
              </p>
              <div className="mt-7 grid gap-2 border-l border-[#caaa84] pl-4 sm:mt-8 sm:gap-3 sm:pl-5">
                {t.ipLines.map((line, index) => (
                  <p
                    key={line}
                    className="font-serif text-xl leading-snug text-[#21170f] min-[390px]:text-[1.35rem] sm:text-3xl"
                    data-home-reveal="up"
                    style={
                      {
                        "--home-reveal-delay": `${index * 80}ms`,
                      } as CSSProperties
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[#1d140f] px-5 py-16 text-white sm:px-6 md:py-28 lg:px-8">
          <Image
            src={homeMedia.creatorIdentity}
            alt=""
            fill
            sizes="100vw"
            className="absolute inset-0 -z-10 object-cover opacity-[0.36]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(29,20,15,0.94),rgba(29,20,15,0.76)_54%,rgba(29,20,15,0.56))]" />
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.56fr_0.44fr] lg:items-end">
            <div data-home-reveal="left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e0b98e]">
                {t.identityEyebrow}
              </p>
              <h2 className="mt-4 max-w-3xl font-serif text-[2.15rem] leading-tight text-white sm:text-6xl">
                {t.identityTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-[15px] leading-8 text-white/72 sm:mt-6 sm:text-lg">
                {t.identityDescription}
              </p>
              <Link
                href={withLocale(locale, "/co-creators")}
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#1e140e] shadow-[0_18px_54px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#fff6e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-6"
              >
                {t.primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {t.identityBenefits.map((benefit, index) => {
                const icons = [BadgeCheck, Gem, Layers3, PenLine] as const;
                const Icon = icons[index % icons.length];

                return (
                  <div
                    key={benefit}
                    className="rounded-2xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur sm:rounded-3xl sm:p-5"
                    data-home-reveal="up"
                    style={
                      {
                        "--home-reveal-delay": `${index * 80}ms`,
                      } as CSSProperties
                    }
                  >
                    <Icon className="h-4 w-4 text-[#e0b98e] sm:h-5 sm:w-5" aria-hidden="true" />
                    <p className="mt-3 text-xs font-semibold text-white sm:mt-4 sm:text-sm">
                      {benefit}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <HomeFooter locale={locale} />
    </>
  );
}
