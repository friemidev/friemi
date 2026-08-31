import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  getWerewolfRoleCardImage,
  getWerewolfSeatBackImage,
  werewolfUiAssets,
} from "@/features/game-tools/werewolfCardAssets";
import {
  getWerewolfRoleCopy,
  type WerewolfRoleKey,
} from "@/features/game-tools/werewolfConfig";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type WerewolfCardPreviewPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const previewRoleKeys: WerewolfRoleKey[] = [
  "werewolf",
  "seer",
  "witch",
  "hunter",
  "idiot",
  "villager",
];

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Retour",
      cardBack: "Dos",
      death: "Éliminée",
      front: "Face",
      roleGuide: "Guide des rôles",
      seatSeven: "Place 7",
      statePreview: "États d'une carte",
      subtitle: "Faces, dos et état éliminé dans une fiche compacte.",
      title: "Cartes Loups-garous",
    };
  }

  if (locale === "en") {
    return {
      back: "Back",
      cardBack: "Back",
      death: "Out",
      front: "Front",
      roleGuide: "Role guide",
      seatSeven: "Seat 7",
      statePreview: "Card states",
      subtitle: "Fronts, numbered backs, and the eliminated state at a glance.",
      title: "Werewolf cards",
    };
  }

  return {
    back: "返回",
    cardBack: "背面",
    death: "出局效果",
    front: "正面",
    roleGuide: "狼人杀卡牌预览",
    seatSeven: "7 号牌",
    statePreview: "狼人杀卡牌预览",
    subtitle: "集中查看角色正面、号码背面和出局状态。",
    title: "狼人杀卡牌",
  };
}

export async function generateMetadata({
  params,
}: WerewolfCardPreviewPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getCopy(locale);

  return {
    title: `${t.title} · ${brand.name}`,
  };
}

export default async function WerewolfCardPreviewPage({
  params,
}: WerewolfCardPreviewPageProps) {
  const { locale } = await params;
  const t = getCopy(locale);
  const roleCopy = getWerewolfRoleCopy(locale);
  const seerImage =
    getWerewolfRoleCardImage("seer", locale) ??
    "/game-tools/werewolf/recto/seer_en.png";

  return (
    <PageContainer
      className="max-w-3xl overflow-x-hidden sm:pb-12 sm:pt-7"
      mobileSafeBottom
      mobileSafeTop
    >
      <header className="flex items-start gap-3 border-b border-[#D8DCCB] pb-4">
        <Link
          aria-label={t.back}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#CAD0BC] bg-white text-[#153B31] transition hover:bg-[#F1F2E3]"
          href={withLocale(locale, "/game-tools/werewolf")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-[#132D28]">
            {t.title}
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#52655E]">
            {t.subtitle}
          </p>
        </div>
      </header>

      <div className="mt-5 overflow-hidden border border-[#BFC7B5] bg-white">
        <SectionTitle>{t.statePreview}</SectionTitle>
        <div className="grid grid-cols-3 gap-2 px-3 py-4 sm:gap-5 sm:px-6">
          <CardStatePreview
            imageSrc={seerImage}
            label={t.front}
            title={roleCopy.roleLabels.seer}
          />
          <CardStatePreview
            imageSrc={getWerewolfSeatBackImage(7)}
            label={t.cardBack}
            title={t.seatSeven}
          />
          <CardStatePreview
            dead
            imageSrc={getWerewolfSeatBackImage(7)}
            label={t.death}
            title={t.seatSeven}
          />
        </div>

        <SectionTitle>{t.roleGuide}</SectionTitle>
        <div className="divide-y divide-[#D8DCCB]">
          {previewRoleKeys.map((roleKey) => (
            <RoleGuideRow
              description={roleCopy.roleDescriptions[roleKey]}
              imageSrc={
                getWerewolfRoleCardImage(roleKey, locale) ??
                `/game-tools/werewolf/recto/${roleKey}_en.png`
              }
              key={roleKey}
              label={roleCopy.roleLabels[roleKey]}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="border-y border-[#BFC7B5] bg-[#F1F2E3] px-4 py-2 text-center text-sm font-bold text-[#153B31] first:border-t-0">
      {children}
    </h2>
  );
}

function CardStatePreview({
  dead = false,
  imageSrc,
  label,
  title,
}: {
  dead?: boolean;
  imageSrc: string;
  label: string;
  title: string;
}) {
  return (
    <figure className="min-w-0 text-center">
      <div
        className={cn(
          "relative mx-auto aspect-[2/3] w-full max-w-[7rem] overflow-hidden border border-[#68736A] bg-[#F5F6F0]",
          dead && "grayscale",
        )}
      >
        <Image
          alt={title}
          className="object-cover"
          draggable={false}
          fill
          sizes="7rem"
          src={imageSrc}
        />
        {dead ? (
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 object-cover opacity-90"
            draggable={false}
            fill
            sizes="7rem"
            src={werewolfUiAssets.deathOverlayMask}
          />
        ) : null}
      </div>
      <figcaption className="mt-2 min-w-0">
        <span className="block truncate text-xs font-bold text-[#173D33]">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-[#68736A]">
          {label}
        </span>
      </figcaption>
    </figure>
  );
}

function RoleGuideRow({
  description,
  imageSrc,
  label,
}: {
  description: string;
  imageSrc: string;
  label: string;
}) {
  return (
    <article className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 px-4 py-4 sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:px-6">
      <div className="relative aspect-[2/3] w-full overflow-hidden border border-[#68736A] bg-[#F5F6F0]">
        <Image
          alt={label}
          className="object-cover"
          draggable={false}
          fill
          sizes="5.25rem"
          src={imageSrc}
        />
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-[#132D28]">{label}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#52655E]">
          {description}
        </p>
      </div>
    </article>
  );
}
