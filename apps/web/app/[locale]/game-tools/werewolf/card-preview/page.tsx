import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  getWerewolfSeatBackImage,
  werewolfUiAssets,
} from "@/features/game-tools/werewolfCardAssets";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";

type WerewolfCardPreviewPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const roleCards = [
  { key: "werewolf", label: "Werewolf" },
  { key: "seer", label: "Seer" },
  { key: "witch", label: "Witch" },
  { key: "hunter", label: "Hunter" },
  { key: "villager", label: "Villager" },
  { key: "idiot", label: "Idiot" },
  { key: "guard", label: "Guard" },
  { key: "cupid", label: "Cupid" },
  { key: "knight", label: "Knight" },
  { key: "lovers", label: "Lovers" },
  { key: "wolf_king", label: "Wolf King" },
  { key: "white_wolf_king", label: "White Wolf King" },
] as const;

function getRoleCardImage(roleKey: string) {
  return `/game-tools/werewolf/recto/${roleKey}_en.png`;
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Retour",
      backs: "Dos de carte",
      death: "Effet éliminé",
      deathMotion: "Animation éliminé",
      fullscreen: "Carte en jeu",
      motionHint: "L'animation tourne en boucle.",
      roles: "Faces de rôle",
      subtitle: "Aperçu direct des cartes et états visuels.",
      title: "Aperçu cartes Loups-garous",
    };
  }

  if (locale === "en") {
    return {
      back: "Back",
      backs: "Card backs",
      death: "Out effect",
      deathMotion: "Out animation",
      fullscreen: "In-game card",
      motionHint: "The animation loops automatically.",
      roles: "Role fronts",
      subtitle: "A direct view of every card and visual state.",
      title: "Werewolf card preview",
    };
  }

  return {
    back: "返回",
    backs: "背面牌",
    death: "出局效果",
    deathMotion: "出局动态样板",
    fullscreen: "局内全屏卡牌",
    motionHint: "自动循环播放。",
    roles: "角色正面牌",
    subtitle: "一次看完卡牌、翻牌、出局和结算视觉。",
    title: "狼人杀卡牌预览",
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

  return (
    <PageContainer className="max-w-[108rem] overflow-x-hidden pb-28 pt-4 sm:pb-12 sm:pt-7">
      <style>
        {`
          @keyframes werewolf-death-card {
            0%, 22% {
              filter: saturate(1) brightness(1) grayscale(0);
              transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            }
            26% {
              filter: saturate(1.12) brightness(1.05) grayscale(0);
              transform: translate3d(-10px, 0, 0) rotate(-1.5deg) scale(1.012);
            }
            31% {
              transform: translate3d(8px, -2px, 0) rotate(1.4deg) scale(1.01);
            }
            36% {
              transform: translate3d(-5px, 2px, 0) rotate(-0.8deg) scale(1.006);
            }
            48% {
              filter: saturate(.66) brightness(.78) grayscale(.62);
              transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            }
            64%, 100% {
              filter: saturate(.08) brightness(.58) grayscale(1) contrast(1.08);
              transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            }
          }

          @keyframes werewolf-death-overlay {
            0%, 44% {
              opacity: 0;
              transform: scale(1.04);
            }
            62% {
              opacity: .78;
              transform: scale(1);
            }
            76%, 100% {
              opacity: .9;
              transform: scale(1);
            }
          }

          @keyframes werewolf-death-blood-drip {
            0%, 22% {
              opacity: 0;
              transform: translateY(-9%) scaleX(1.02) scaleY(.92);
            }
            34% {
              opacity: .98;
              transform: translateY(-1%) scaleX(1.01) scaleY(1.02);
            }
            44% {
              opacity: 1;
              transform: translateY(1.8%) scaleX(1) scaleY(1.06);
            }
            62% {
              opacity: .82;
              transform: translateY(4.8%) scaleX(1) scaleY(1.09);
            }
            78%, 100% {
              opacity: 0;
              transform: translateY(6.2%) scaleX(1) scaleY(1.08);
            }
          }

          .werewolf-death-demo-card {
            animation: werewolf-death-card 3.8s ease-in-out infinite;
          }

          .werewolf-death-demo-overlay {
            animation: werewolf-death-overlay 3.8s ease-in-out infinite;
          }

          .werewolf-death-demo-blood-drip {
            animation: werewolf-death-blood-drip 3.8s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .werewolf-death-demo-card,
            .werewolf-death-demo-overlay,
            .werewolf-death-demo-blood-drip {
              animation: none;
            }

            .werewolf-death-demo-card {
              filter: saturate(.08) brightness(.58) grayscale(1) contrast(1.08);
            }

            .werewolf-death-demo-overlay {
              opacity: .9;
            }

            .werewolf-death-demo-blood-drip {
              opacity: 0;
            }
          }
        `}
      </style>
      <div className="space-y-5">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D9C7B4] bg-white px-4 text-sm font-bold text-[#7A1F2B] shadow-sm transition hover:bg-[#FFF7F1]"
          href={withLocale(locale, "/game-tools/werewolf")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>

        <section className="overflow-hidden rounded-[1.75rem] border border-[#3A2A2D] bg-[#101316] text-white shadow-[0_28px_90px_rgba(30,23,24,0.28)]">
          <div className="bg-[radial-gradient(circle_at_50%_18%,rgba(240,195,106,0.16),transparent_34%),linear-gradient(180deg,#15191D,#0C0E10)] p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F0C36A]">
              {t.fullscreen}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/66">
              {t.subtitle}
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
            <FullscreenCardPreview
              imageSrc={getWerewolfSeatBackImage(7)}
              label="Back"
            />
            <FullscreenCardPreview
              imageSrc={getRoleCardImage("seer")}
              label="Front"
            />
            <FullscreenCardPreview
              dead
              imageSrc={getWerewolfSeatBackImage(7)}
              label={t.death}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-[#3A2A2D] bg-[#101316] text-white shadow-[0_28px_90px_rgba(30,23,24,0.24)]">
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(22rem,1fr)] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F0C36A]">
                {t.deathMotion}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-normal sm:text-4xl">
                {t.death}
              </h2>
              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/60">
                {t.motionHint}
              </p>
            </div>
            <DeathMotionPreview
              imageSrc={getWerewolfSeatBackImage(7)}
              label={t.deathMotion}
            />
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[#D9C7B4] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-black text-[#1E1718]">{t.roles}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {roleCards.map((card) => (
              <PreviewCard
                imageSrc={getRoleCardImage(card.key)}
                key={card.key}
                label={card.label}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[#D9C7B4] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-black text-[#1E1718]">{t.backs}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (seatNumber) => (
                <PreviewCard
                  imageSrc={getWerewolfSeatBackImage(seatNumber)}
                  key={seatNumber}
                  label={`${seatNumber}`}
                />
              ),
            )}
          </div>
        </section>

      </div>
    </PageContainer>
  );
}

function DeathMotionPreview({
  imageSrc,
  label,
}: {
  imageSrc: string;
  label: string;
}) {
  return (
    <div className="grid place-items-center rounded-[1.3rem] border border-white/10 bg-white/[0.06] p-4 text-center">
      <div className="relative aspect-[2/3] h-[38rem] max-h-[68svh] max-w-[84vw] overflow-hidden rounded-[1.35rem] border border-[#D9C7B4] bg-[#1E1718] shadow-[0_30px_80px_rgba(0,0,0,0.48)]">
        <img
          alt={label}
          className="werewolf-death-demo-card h-full w-full object-cover"
          draggable={false}
          src={imageSrc}
        />
        <img
          alt=""
          aria-hidden="true"
          className="werewolf-death-demo-blood-drip pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
          draggable={false}
          src={werewolfUiAssets.deathBloodDripEffect}
        />
        <img
          alt=""
          aria-hidden="true"
          className="werewolf-death-demo-overlay pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
          draggable={false}
          src={werewolfUiAssets.deathOverlayMask}
        />
      </div>
    </div>
  );
}

function FullscreenCardPreview({
  dead = false,
  imageSrc,
  label,
}: {
  dead?: boolean;
  imageSrc: string;
  label: string;
}) {
  return (
    <div className="grid place-items-center rounded-[1.3rem] border border-white/10 bg-white/[0.06] p-4 text-center">
      <div
        className={`relative aspect-[2/3] h-[34rem] max-h-[62svh] max-w-[82vw] overflow-hidden rounded-[1.35rem] border border-[#D9C7B4] bg-[#1E1718] shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${
          dead ? "grayscale" : ""
        }`}
      >
        <img
          alt={label}
          className="h-full w-full object-cover"
          draggable={false}
          src={imageSrc}
        />
        {dead ? (
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
            draggable={false}
            src={werewolfUiAssets.deathOverlayMask}
          />
        ) : null}
      </div>
      <p className="mt-3 text-sm font-black text-white/78">{label}</p>
    </div>
  );
}

function PreviewCard({
  imageSrc,
  label,
}: {
  imageSrc: string;
  label: string;
}) {
  return (
    <div className="grid place-items-center rounded-[1.1rem] border border-[#D9C7B4] bg-[#FFFDF7] p-3 text-center shadow-sm">
      <div className="aspect-[2/3] w-full overflow-hidden rounded-[0.9rem] border border-[#D9C7B4] bg-white shadow-sm">
        <img
          alt={label}
          className="h-full w-full object-cover"
          draggable={false}
          src={imageSrc}
        />
      </div>
      <p className="mt-2 max-w-full truncate text-xs font-black text-[#7A1F2B]">
        {label}
      </p>
    </div>
  );
}
