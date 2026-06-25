import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  FileText,
  Fingerprint,
  Megaphone,
  Repeat2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { PageContainer } from "@/components/layout/PageContainer";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type CoCreatorsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type BenefitCopy = {
  description: string;
  subtitle: string;
  title: string;
};

const benefitIcons = [
  Megaphone,
  FileText,
  CalendarCheck2,
  Repeat2,
  UsersRound,
  Fingerprint,
  BadgeCheck,
] as const;

const coCreatorsCopy = {
  "zh-CN": {
    metadata: {
      title: "FRIEMI 共创主理人",
      description:
        "让零散的小局，变成可积累的活动社群；让你的个人 IP，变成更清晰的主理人品牌。",
    },
    hero: {
      badge: "FRIEMI 共创主理人",
      eyebrow: "FRIEMI 能为共创主理人带来什么？",
      title: "让零散的小局，变成可积累的活动社群。",
      description:
        "让你原本零散的小局，变成更好传播、更容易报名、更方便复用、更能沉淀人气，并且帮助你的个人 IP 更加品牌化。",
    },
    flowSteps: ["零散邀约", "清晰页面", "社群沉淀"],
    flowSummary:
      "从一次活动开始，沉淀你自己的组织风格、常客关系和可传播的主理人形象。",
    core: {
      eyebrow: "核心一句话",
      title: "把组织活动这件事，变成可以持续增长的能力。",
      description:
        "你的活动不只是一次性通知，而是可转发、可报名、可复用、可沉淀的社群入口。",
    },
    benefits: [
      {
        title: "好转发",
        subtitle: "活动链接清晰，方便分享",
        description:
          "你的活动不再只是微信群里的一段文字，而是一个清晰完整的活动页面，方便分享到微信群、朋友圈、小红书、Instagram 等渠道。",
      },
      {
        title: "更专业",
        subtitle: "统一页面展示，提升信任感",
        description:
          "活动时间、地点、人数、费用、规则、报名方式都可以统一展示，让参与者一眼看懂，也更容易产生信任感。",
      },
      {
        title: "易报名",
        subtitle: "减少私聊接龙，方便管理参与者",
        description:
          "不用反复私聊、接龙和人工统计，可以更轻松地收集报名信息，管理参与者。",
      },
      {
        title: "易复用",
        subtitle: "活动模板化，重复组局更轻松",
        description:
          "活动可以模板化，下一次组织类似活动时不用从零开始，适合长期、稳定、重复举办。",
      },
      {
        title: "能沉淀",
        subtitle: "积累活动记录、常客和社群关系",
        description:
          "每一次活动都不再是一次性消耗，而是可以逐渐积累活动记录、常客关系和自己的小型社群。",
      },
      {
        title: "强 IP",
        subtitle: "让你的个人 IP 更加品牌化",
        description:
          "通过持续发布活动、展示主理人身份、积累活动记录和参与者反馈，你不只是偶尔组局的人，而是逐渐形成一个有主题、有风格、有信任感的个人 IP。",
      },
      {
        title: "有身份",
        subtitle: "获得共创主理人认证与早期特权",
        description:
          "你将获得 FRIEMI 共创主理人身份，享受早期认证、优先展示、产品共创和未来合作机会。",
      },
    ],
    ip: {
      eyebrow: "个人 IP 更品牌化",
      title: "让别人更容易记住你，也更容易信任你。",
      description:
        "FRIEMI 帮助你把零散印象沉淀成一个更清晰、更专业、更容易传播的个人品牌。",
      examples: [
        "你是那个长期组织读书会的人。",
        "你是那个经常办高质量桌游局的人。",
        "你是那个很会组织城市散步和探店活动的人。",
        "你是那个能把大家聚在一起的人。",
      ],
    },
    recruitment: {
      eyebrow: "更适合招募页的表达",
      lines: [
        "用一个清晰完整的活动页面，代替微信群里反复复制粘贴的文字。",
        "统一展示时间、地点、费用、人数、规则和报名方式，提升参与者信任感。",
        "减少私聊、接龙和人工统计，更方便收集与管理参与者。",
        "通过活动模板和历史记录，让长期活动不再每次从零开始。",
        "把每次来过的人、参与过的活动和形成的关系积累下来。",
        "通过持续组织活动，形成清晰的主理人形象，让更多人记住你、关注你、信任你。",
        "拥有早期认证、优先展示、产品共创和未来合作机会。",
      ],
    },
    poster: {
      eyebrow: "更短的海报版",
      title: "成为 FRIEMI 共创主理人，你能获得什么？",
    },
    final: {
      eyebrow: "最终关键词",
      title: "好转发｜更专业｜易报名｜易复用｜能沉淀｜强 IP｜有身份",
      description:
        "让零散的小局，变成可积累的活动社群；让你的个人 IP，变成更清晰的主理人品牌。",
    },
    cta: "看看活动如何展示",
  },
  en: {
    metadata: {
      title: "FRIEMI Co-creator Program",
      description:
        "Turn casual plans into a community people can join, remember, and share.",
    },
    hero: {
      badge: "FRIEMI Co-creator Program",
      eyebrow: "What can FRIEMI bring to co-creators?",
      title: "Turn casual plans into a community that keeps growing.",
      description:
        "Make your gatherings easier to share, easier to join, easier to reuse, and better at building a recognizable personal brand.",
    },
    flowSteps: ["Loose invite", "Clear page", "Community memory"],
    flowSummary:
      "Start with one activity, then build your organizing style, returning guests, and a shareable creator identity.",
    core: {
      eyebrow: "Core idea",
      title: "Make organizing activities a repeatable growth engine.",
      description:
        "Your activity is not just a one-time notice. It becomes a shareable, joinable, reusable entry point for your community.",
    },
    benefits: [
      {
        title: "Shareable",
        subtitle: "Clear links for every channel",
        description:
          "Replace scattered chat messages with one complete activity page that can be shared in groups, Moments, Xiaohongshu, Instagram, and more.",
      },
      {
        title: "Professional",
        subtitle: "A page that builds trust",
        description:
          "Time, place, capacity, cost, rules, and signup details are shown in one place, so participants understand the plan quickly.",
      },
      {
        title: "Easy signup",
        subtitle: "Less DM work, cleaner lists",
        description:
          "Collect participant information and manage signups without repeating the same private messages or manual headcounts.",
      },
      {
        title: "Reusable",
        subtitle: "Templates for recurring plans",
        description:
          "Turn repeat activities into templates, so the next book club, board game night, walk, or dinner does not start from zero.",
      },
      {
        title: "Lasting ties",
        subtitle: "Build history and regulars",
        description:
          "Every event can add to your activity history, returning participant relationships, and a small community around your style.",
      },
      {
        title: "Stronger IP",
        subtitle: "Make your creator style visible",
        description:
          "With repeated activities, a visible host identity, and participant memory, you become more than someone who occasionally organizes plans.",
      },
      {
        title: "Identity",
        subtitle: "Early recognition and priority",
        description:
          "Get a FRIEMI co-creator identity, early recognition, priority exposure, product co-creation access, and future collaboration opportunities.",
      },
    ],
    ip: {
      eyebrow: "A clearer personal brand",
      title: "Make it easier for people to remember and trust you.",
      description:
        "FRIEMI turns scattered impressions into a clearer, more professional, and more shareable creator brand.",
      examples: [
        "You are the person who keeps the reading club going.",
        "You are known for thoughtful board game nights.",
        "You organize city walks and cafe discoveries with taste.",
        "You are the person who brings people together.",
      ],
    },
    recruitment: {
      eyebrow: "Recruitment page version",
      lines: [
        "Use one clear activity page instead of repeatedly pasting text into group chats.",
        "Show time, place, cost, capacity, rules, and signup details in a trusted format.",
        "Reduce DMs, manual lists, and repeated confirmations while managing participants more easily.",
        "Use templates and history so recurring activities do not start from scratch.",
        "Keep track of people who joined, activities they attended, and relationships that grow over time.",
        "Build a recognizable host identity through consistent activities, style, and trust.",
        "Receive early recognition, priority exposure, product co-creation access, and future collaboration opportunities.",
      ],
    },
    poster: {
      eyebrow: "Short poster version",
      title: "What do you get as a FRIEMI co-creator?",
    },
    final: {
      eyebrow: "Final keywords",
      title:
        "Shareable | Professional | Easy signup | Reusable | Lasting ties | Stronger IP | Identity",
      description:
        "Turn casual plans into a community that can accumulate; turn your personal IP into a clearer creator brand.",
    },
    cta: "See how activities look",
  },
  fr: {
    metadata: {
      title: "Programme co-createurs FRIEMI",
      description:
        "Transformez des sorties ponctuelles en communaute durable, visible et facile a partager.",
    },
    hero: {
      badge: "Programme co-createurs FRIEMI",
      eyebrow: "Que peut apporter FRIEMI aux co-createurs ?",
      title: "Transformez vos petites sorties en communaute qui grandit.",
      description:
        "Rendez vos activites plus faciles a partager, a rejoindre, a reutiliser, et a transformer en image personnelle plus claire.",
    },
    flowSteps: ["Invitation eparse", "Page claire", "Memoire de communaute"],
    flowSummary:
      "Commencez par une activite, puis construisez votre style d'organisation, vos habitues et une identite de createur partageable.",
    core: {
      eyebrow: "Idee centrale",
      title: "Faire de l'organisation d'activites une force qui se repete.",
      description:
        "Votre activite n'est plus seulement une annonce ponctuelle. Elle devient une entree partageable, reutilisable et facile a rejoindre.",
    },
    benefits: [
      {
        title: "Partageable",
        subtitle: "Un lien clair pour chaque canal",
        description:
          "Remplacez les messages eparpilles par une page complete, facile a partager dans les groupes, Moments, Xiaohongshu, Instagram et ailleurs.",
      },
      {
        title: "Plus pro",
        subtitle: "Une page qui inspire confiance",
        description:
          "Heure, lieu, places, prix, regles et inscription sont presentes au meme endroit pour que chacun comprenne vite l'activite.",
      },
      {
        title: "Inscription simple",
        subtitle: "Moins de messages prives",
        description:
          "Collectez les informations et gerez les participants sans refaire les memes messages ni compter les places a la main.",
      },
      {
        title: "Reutilisable",
        subtitle: "Des modeles pour les sorties regulieres",
        description:
          "Transformez vos activites recurrentes en modeles pour ne pas recommencer depuis zero a chaque nouvelle edition.",
      },
      {
        title: "Relations durables",
        subtitle: "Historique, habitues et communaute",
        description:
          "Chaque activite peut enrichir votre historique, vos relations avec les participants et votre petite communaute.",
      },
      {
        title: "IP plus forte",
        subtitle: "Un style de createur plus visible",
        description:
          "Avec des activites regulieres, une identite de host visible et des retours accumules, vous devenez plus qu'une personne qui organise parfois.",
      },
      {
        title: "Identite",
        subtitle: "Reconnaissance et priorite",
        description:
          "Obtenez l'identite de co-createur FRIEMI, une reconnaissance precoce, plus de visibilite, un acces a la co-creation produit et de futures opportunites.",
      },
    ],
    ip: {
      eyebrow: "Une marque personnelle plus claire",
      title: "Aidez les autres a mieux vous retenir et vous faire confiance.",
      description:
        "FRIEMI transforme des impressions dispersees en une image de createur plus claire, plus professionnelle et plus facile a partager.",
      examples: [
        "Vous etes la personne qui fait vivre le club de lecture.",
        "Vous etes connu pour des soirees jeux bien organisees.",
        "Vous organisez des balades urbaines et des sorties cafe avec gout.",
        "Vous etes la personne qui rassemble les autres.",
      ],
    },
    recruitment: {
      eyebrow: "Version pour page de recrutement",
      lines: [
        "Utilisez une page claire au lieu de recopier le meme texte dans les groupes.",
        "Affichez heure, lieu, prix, places, regles et inscription dans un format fiable.",
        "Reduisez les messages prives, les listes manuelles et les confirmations repetees.",
        "Utilisez des modeles et l'historique pour ne pas repartir de zero.",
        "Gardez la trace des participants, des activites rejointes et des relations qui se construisent.",
        "Construisez une identite de host reconnaissable grace a des activites coherentes.",
        "Profitez d'une reconnaissance precoce, d'une meilleure visibilite, de la co-creation produit et de futures collaborations.",
      ],
    },
    poster: {
      eyebrow: "Version courte pour affiche",
      title: "Que gagnez-vous en devenant co-createur FRIEMI ?",
    },
    final: {
      eyebrow: "Mots-cles finaux",
      title:
        "Partageable | Plus pro | Inscription simple | Reutilisable | Relations durables | IP plus forte | Identite",
      description:
        "Transformez des sorties ponctuelles en communaute cumulative ; transformez votre image personnelle en marque de createur plus claire.",
    },
    cta: "Voir les activites",
  },
} as const;

function getCoCreatorsCopy(locale: string) {
  return (
    coCreatorsCopy[locale as keyof typeof coCreatorsCopy] ??
    coCreatorsCopy["zh-CN"]
  );
}

function getBenefitIcon(index: number) {
  return benefitIcons[index] ?? BadgeCheck;
}

function getIndexedAnimationDelay(index: number) {
  return `${index * 120}ms`;
}

function getOneBasedIndex(index: number) {
  return index + 1;
}

function getItemKey(value: string, index: number) {
  return `${index}-${value}`;
}

function getCoCreatorsPath(locale: string) {
  return withLocale(locale, "/co-creators");
}

function getActivitiesPath(locale: string) {
  return withLocale(locale, "/activities");
}

function NumberBadge({ value }: { value: number }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d88d72] text-xs font-bold text-white">
      {value}
    </span>
  );
}

function SectionEyebrow({
  children,
  icon = null,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#a85f40] ring-1 ring-[#ddcdb1]">
      {icon}
      {children}
    </div>
  );
}

function LocalizedLogoBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex w-fit items-center gap-3 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#5f4935] ring-1 ring-[#ddcdb1]">
      <Image
        alt=""
        className="h-7 w-7 object-contain"
        height={28}
        src={brand.logoIconPath}
        width={28}
      />
      {label}
    </div>
  );
}

function FlowCard({
  index,
  label,
}: {
  index: number;
  label: string;
}) {
  return (
    <div
      className="co-creator-flow-card flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[#fffaf2] px-4 ring-1 ring-[#e5d5b9]"
      style={{ animationDelay: getIndexedAnimationDelay(index) }}
    >
      <span className="text-sm font-semibold text-[#47382b]">{label}</span>
      <NumberBadge value={getOneBasedIndex(index)} />
    </div>
  );
}

function BenefitRow({
  benefit,
  index,
}: {
  benefit: BenefitCopy;
  index: number;
}) {
  const Icon = getBenefitIcon(index);

  return (
    <article
      className="co-creator-benefit-row grid gap-3 border-b border-[#ecdeca] p-3 last:border-b-0 sm:grid-cols-[2.5rem_minmax(7rem,0.42fr)_minmax(0,1fr)] sm:items-center"
      key={benefit.title}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff4ea] text-[#a85f40] ring-1 ring-[#e7c5aa]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink">{benefit.title}</h3>
        <p className="mt-0.5 text-sm font-medium leading-5 text-[#856141]">
          {benefit.subtitle}
        </p>
      </div>
      <p className="text-sm leading-6 text-zinc-600">
        {benefit.description}
      </p>
    </article>
  );
}

function RecruitmentLine({
  index,
  text,
}: {
  index: number;
  text: string;
}) {
  return (
    <div className="grid min-h-24 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#dfcfb5]">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff4ea] text-sm font-bold text-[#9a593b] ring-1 ring-[#e7c5aa]">
        {getOneBasedIndex(index)}
      </span>
      <p className="self-center text-sm leading-6 text-zinc-700">{text}</p>
    </div>
  );
}

function KeywordPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#fff4ea] px-3 py-2 text-sm font-semibold text-[#6b4b35] ring-1 ring-[#e7c5aa]">
      {label}
    </span>
  );
}

function getBenefitTitleKey(benefit: { title: string }, index: number) {
  return getItemKey(benefit.title, index);
}

function getCopyLineKey(line: string, index: number) {
  return getItemKey(line, index);
}

function getExampleKey(example: string, index: number) {
  return getItemKey(example, index);
}

function getFlowStepKey(step: string, index: number) {
  return getItemKey(step, index);
}

function getMetadataForLocale(locale: string) {
  return getCoCreatorsCopy(locale).metadata;
}

function getPageCopy(locale: string) {
  return getCoCreatorsCopy(locale);
}

function LocalizedCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(17,17,17,0.14)] transition hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35"
      href={href}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export async function generateMetadata({
  params,
}: CoCreatorsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const metadata = getMetadataForLocale(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: metadata.description,
    path: getCoCreatorsPath(locale),
    title: metadata.title,
  });
}

export default async function CoCreatorsPage({ params }: CoCreatorsPageProps) {
  const { locale } = await params;
  const t = getPageCopy(locale);
  const activitiesPath = getActivitiesPath(locale);

  return (
    <>
      <PageContainer className="co-creator-page pb-8 pt-4 md:pb-12 md:pt-7">
        <section className="co-creator-reveal grid gap-5 border-b border-[#ddcdb1] pb-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch lg:pb-8">
          <div className="flex min-w-0 flex-col justify-center gap-5">
            <div className="space-y-4">
              <LocalizedLogoBadge label={t.hero.badge} />

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#a85f40]">
                  {t.hero.eyebrow}
                </p>
                <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-ink sm:text-4xl lg:text-[2.75rem]">
                  {t.hero.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-zinc-700">
                  {t.hero.description}
                </p>
              </div>
            </div>
          </div>

          <aside className="relative grid content-between gap-5 overflow-hidden rounded-[1.35rem] border border-[#ddcdb1] bg-white p-5 shadow-[0_18px_44px_rgba(96,72,42,0.08)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-[#e8d8bd] pb-4">
                <Image
                  alt={brand.name}
                  className="h-auto w-32 object-contain"
                  height={64}
                  priority
                  src={brand.titleImagePath}
                  width={190}
                />
              </div>

              <div className="grid gap-2.5">
                {t.flowSteps.map((step, index) => (
                  <FlowCard
                    index={index}
                    key={getFlowStepKey(step, index)}
                    label={step}
                  />
                ))}
              </div>
            </div>

            <p className="rounded-2xl bg-[#fffaf2] p-4 text-sm font-medium leading-6 text-[#6b5948] ring-1 ring-[#e5d5b9]">
              {t.flowSummary}
            </p>
          </aside>
        </section>

        <section className="grid gap-4 py-7 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)] lg:gap-5 lg:py-8">
          <div className="co-creator-reveal rounded-[1.25rem] border border-[#d9c8ad] bg-white p-5 text-ink shadow-[0_18px_44px_rgba(96,72,42,0.08)] lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-semibold text-[#a85f40]">
              {t.core.eyebrow}
            </p>
            <h2 className="mt-3 text-xl font-semibold leading-snug tracking-normal">
              {t.core.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              {t.core.description}
            </p>
            <div className="mt-5">
              <LocalizedCta href={activitiesPath} label={t.cta} />
            </div>
          </div>

          <div className="co-creator-reveal rounded-[1.25rem] border border-[#dfcfb5] bg-white p-3 shadow-[0_18px_44px_rgba(96,72,42,0.06)]">
            {t.benefits.map((benefit, index) => (
              <BenefitRow
                benefit={benefit}
                index={index}
                key={getBenefitTitleKey(benefit, index)}
              />
            ))}
          </div>
        </section>

        <section className="co-creator-reveal grid gap-5 border-y border-[#ddcdb1] py-7 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-center lg:gap-7 lg:py-8">
          <div className="space-y-4">
            <SectionEyebrow icon={<Sparkles className="h-4 w-4" />}>
              {t.ip.eyebrow}
            </SectionEyebrow>
            <h2 className="text-2xl font-semibold leading-tight tracking-normal text-ink md:text-3xl">
              {t.ip.title}
            </h2>
            <p className="max-w-xl text-base leading-7 text-zinc-700">
              {t.ip.description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {t.ip.examples.map((example, index) => (
              <div
                className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-semibold leading-6 text-zinc-800 ring-1 ring-[#dfcfb5]"
                key={getExampleKey(example, index)}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#d88d72]" />
                <span>{example}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="co-creator-reveal grid gap-5 py-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-start lg:gap-5 lg:py-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[#a85f40]">
              {t.recruitment.eyebrow}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {t.recruitment.lines.map((line, index) => (
                <RecruitmentLine
                  index={index}
                  key={getCopyLineKey(line, index)}
                  text={line}
                />
              ))}
            </div>
          </div>

          <aside className="rounded-[1.25rem] border border-[#d9c8ad] bg-white p-5 text-ink shadow-[0_18px_44px_rgba(96,72,42,0.08)]">
            <p className="text-sm font-semibold text-[#a85f40]">
              {t.poster.eyebrow}
            </p>
            <h2 className="mt-3 text-xl font-semibold leading-snug tracking-normal">
              {t.poster.title}
            </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {t.benefits.map((benefit, index) => (
                <KeywordPill
                  key={getBenefitTitleKey(benefit, index)}
                  label={benefit.title}
                />
              ))}
            </div>
          </aside>
        </section>

        <section className="co-creator-reveal rounded-[1.4rem] border border-[#d9c8ad] bg-white p-5 text-ink shadow-[0_18px_44px_rgba(96,72,42,0.08)] md:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-2.5">
              <p className="text-sm font-bold text-[#a85f40]">
                {t.final.eyebrow}
              </p>
              <h2 className="text-xl font-semibold leading-snug tracking-normal md:text-2xl">
                {t.final.title}
              </h2>
              <p className="max-w-3xl text-base leading-7 text-zinc-700">
                {t.final.description}
              </p>
            </div>
            <LocalizedCta href={activitiesPath} label={t.cta} />
          </div>
        </section>
      </PageContainer>
      <HomeFooter locale={locale} />
    </>
  );
}
