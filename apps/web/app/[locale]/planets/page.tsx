import type { Metadata } from "next";
import { Plus } from "lucide-react";

type PlanetsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const planetCopy = {
  "zh-CN": {
    create: "创建星球",
    createHint: "星球聚变",
    memberUnit: "成员",
    subtitle: "汇聚你所需星球",
    title: "星际之间",
  },
  en: {
    create: "Create Planet",
    createHint: "Build a new orbit",
    memberUnit: "members",
    subtitle: "Find the orbit that fits you",
    title: "Between Planets",
  },
  fr: {
    create: "Créer une planète",
    createHint: "Lancez une nouvelle orbite",
    memberUnit: "membres",
    subtitle: "Trouvez l'orbite qui vous ressemble",
    title: "Entre planètes",
  },
} as const;

const planets = [
  {
    accent: "#93BDD1",
    bg: "linear-gradient(135deg,#0D2732 0%,#123D4D 100%)",
    members: 326,
    moon: "#B4BEE8",
    name: {
      "zh-CN": "桌游星球",
      en: "Board Game Planet",
      fr: "Planète jeux",
    },
    rings: "#D7D0BC",
  },
  {
    accent: "#F39D87",
    bg: "linear-gradient(135deg,#102637 0%,#24374E 100%)",
    members: 532,
    moon: "#D85A80",
    name: {
      "zh-CN": "音乐共振",
      en: "Music Vibes",
      fr: "Vibes musique",
    },
    rings: "#E9B26F",
  },
  {
    accent: "#B8D7A8",
    bg: "linear-gradient(135deg,#8EC6C4 0%,#4D907A 100%)",
    members: 412,
    moon: "#F6D89F",
    name: {
      "zh-CN": "户外俱乐部",
      en: "Outdoor Club",
      fr: "Club outdoor",
    },
    rings: "#FEFFF9",
  },
  {
    accent: "#F7C06A",
    bg: "linear-gradient(135deg,#F79E4B 0%,#F2D58B 100%)",
    members: 276,
    moon: "#FFF1C7",
    name: {
      "zh-CN": "饭局星球",
      en: "Food Lovers",
      fr: "À table",
    },
    rings: "#FFF5E6",
  },
  {
    accent: "#A8DBE6",
    bg: "linear-gradient(135deg,#B8E0EA 0%,#96C8D0 100%)",
    members: 189,
    moon: "#FFF6D8",
    name: {
      "zh-CN": "学习星球",
      en: "Study Planet",
      fr: "Planète étude",
    },
    rings: "#FEFFF9",
  },
  {
    accent: "#C2A0DC",
    bg: "linear-gradient(135deg,#14324C 0%,#594476 100%)",
    members: 245,
    moon: "#D9B3EF",
    name: {
      "zh-CN": "二次元世界",
      en: "Anime World",
      fr: "Monde anime",
    },
    rings: "#F7EDE6",
  },
] as const;

function getCopy(locale: string) {
  if (locale === "en" || locale === "fr") {
    return planetCopy[locale];
  }

  return planetCopy["zh-CN"];
}

export async function generateMetadata({
  params,
}: PlanetsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getCopy(locale);

  return {
    title: `${copy.title} | Friemi`,
  };
}

function PlanetIllustration({
  accent,
  bg,
  moon,
  rings,
}: {
  accent: string;
  bg: string;
  moon: string;
  rings: string;
}) {
  return (
    <div
      className="relative h-[5.65rem] overflow-hidden rounded-[0.8rem]"
      style={{ background: bg }}
    >
      <span
        className="absolute left-4 top-4 h-2 w-2 rounded-full bg-white/90"
        aria-hidden="true"
      />
      <span
        className="absolute right-7 top-3 h-1.5 w-1.5 rounded-full bg-white/80"
        aria-hidden="true"
      />
      <span
        className="absolute bottom-4 left-6 h-1.5 w-1.5 rounded-full bg-white/75"
        aria-hidden="true"
      />
      <span
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[inset_-8px_-6px_0_rgba(29,29,27,0.12)]"
        style={{ backgroundColor: moon }}
        aria-hidden="true"
      />
      <span
        className="absolute left-1/2 top-1/2 h-5 w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-full border-4"
        style={{ borderColor: rings }}
        aria-hidden="true"
      />
      <span
        className="absolute bottom-0 left-0 h-9 w-full opacity-80"
        style={{
          background: `linear-gradient(160deg, transparent 20%, ${accent} 21% 38%, transparent 39%)`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default async function PlanetsPage({ params }: PlanetsPageProps) {
  const { locale } = await params;
  const copy = getCopy(locale);

  return (
    <main className="min-h-[100svh] bg-[#FEFFF9] pb-[calc(6.35rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.2rem)] text-[#111210] md:bg-[#EEF4FB]">
      <section className="mx-auto w-full max-w-md px-5 md:rounded-[2rem] md:bg-[#FEFFF9] md:py-6 md:shadow-[0_22px_70px_rgba(15,23,42,0.1)]">
        <div className="mb-5">
          <h1 className="mt-1 text-[20px] font-black leading-7">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#6C746A]">
            {copy.subtitle}
          </p>
        </div>

        <div className="rounded-[1.55rem] border border-[#E3DCC5] bg-white p-3 shadow-[0_18px_42px_rgba(21,98,64,0.08)]">
          <div className="grid grid-cols-3 gap-3">
            {planets.map((planet) => (
              <article className="min-w-0" key={planet.name.en}>
                <PlanetIllustration
                  accent={planet.accent}
                  bg={planet.bg}
                  moon={planet.moon}
                  rings={planet.rings}
                />
                <h2 className="mt-2 line-clamp-1 text-[11px] font-black leading-4 text-[#111210]">
                  {planet.name[locale as keyof typeof planet.name] ??
                    planet.name["zh-CN"]}
                </h2>
                <p className="text-[10px] font-semibold text-[#8E8383]">
                  {planet.members} {copy.memberUnit}
                </p>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 flex h-[5.4rem] w-full items-center justify-center gap-4 rounded-[1.15rem] border border-dashed border-[#D6D5B2] bg-[#FEFFF9] text-left transition active:scale-[0.99]"
          >
            <Plus className="h-9 w-9 text-[#156240]" strokeWidth={2.6} />
            <span>
              <span className="block text-[15px] font-black text-[#156240]">
                {copy.create}
              </span>
              <span className="mt-1 block text-xs font-semibold text-[#6C746A]">
                {copy.createHint}
              </span>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
