import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, Layers3 } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import {
  gameToolDefinitions,
  getGameToolHubCopy,
  getGameToolLabel,
} from "@/features/game-tools/gameToolCatalog";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type GameToolsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const metadataCopy = {
  "zh-CN": {
    description: "Friemi 桌游工具大厅：从 Avalon 到说书人工具，共用同一套线下房间能力。",
    title: "桌游工具大厅",
  },
  en: {
    description:
      "Friemi table tools hub: shared offline room capabilities from Avalon to storyteller tools.",
    title: "Table Tools",
  },
  fr: {
    description:
      "Hub d'outils de table Friemi : une base commune d'Avalon aux outils de conteur.",
    title: "Outils de table",
  },
};

export async function generateMetadata({
  params,
}: GameToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: copy.description,
    path: withLocale(locale, "/game-tools"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function GameToolsPage({ params }: GameToolsPageProps) {
  const { locale } = await params;
  const copy = getGameToolHubCopy(locale);

  return (
    <PageContainer className="max-w-[94rem] space-y-6 pb-28 pt-4 sm:pb-14 sm:pt-7">
      <section className="relative isolate overflow-hidden rounded-[2.1rem] border border-[#8AB68E]/40 bg-[#FEFFF9] p-5 shadow-[0_24px_70px_rgba(21,98,64,0.12)] sm:p-7 lg:p-9">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F09182]/18 blur-3xl" />
        <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-[#DEEBFF]/55 blur-3xl" />
        <div className="absolute right-10 top-12 hidden h-36 w-36 rounded-full border border-[#8AB68E]/35 lg:block" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8AB68E]/50 bg-white/82 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#156240]">
              <Layers3 className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </span>
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-normal text-[#0E2A5C] sm:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#156240]/78 sm:text-lg">
                {copy.hero}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {copy.traits.map((trait) => {
                const Icon = trait.icon;

                return (
                  <span
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D6D5B2] bg-white/82 px-3 text-sm font-bold text-[#156240] shadow-sm"
                    key={trait.label}
                  >
                    <Icon className="h-4 w-4" />
                    {trait.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {gameToolDefinitions.map((tool) => {
              const Icon = tool.icon;
              const isAvailable = tool.availability === "available";

              return (
                <Link
                  className="group relative min-h-[20rem] overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-4 shadow-[0_18px_45px_rgba(21,98,64,0.1)] transition duration-300 hover:-translate-y-1 hover:border-[#8AB68E] hover:shadow-[0_24px_70px_rgba(21,98,64,0.16)]"
                  href={withLocale(locale, tool.href)}
                  key={tool.kind}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundColor: tool.accent }}
                  />
                  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#F1F2EC] blur-2xl transition group-hover:bg-[#DEEBFF]" />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#8AB68E]/45 bg-[#FEFFF9]/90 px-2.5 text-xs font-extrabold text-[#156240]">
                        <Icon className="h-3.5 w-3.5" />
                        {getGameToolLabel(tool.phase, locale)}
                      </span>
                      <span className="rounded-full bg-[#1D1D1B] px-2.5 py-1 text-[11px] font-bold text-white">
                        {tool.minPlayers}-{tool.maxPlayers} {copy.range}
                      </span>
                    </div>

                    <div className="my-6 grid place-items-center">
                      <span className="grid h-28 w-28 place-items-center rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] shadow-[0_18px_38px_rgba(21,98,64,0.12)]">
                        <Image
                          alt=""
                          className="h-20 w-20"
                          height={96}
                          src={tool.imageSrc}
                          width={96}
                        />
                      </span>
                    </div>

                    <div className="mt-auto">
                      <h2 className="text-2xl font-extrabold tracking-normal text-[#0E2A5C]">
                        {getGameToolLabel(tool.title, locale)}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#156240]/70">
                        {getGameToolLabel(tool.description, locale)}
                      </p>
                      <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] transition group-hover:bg-[#369758]">
                        {isAvailable ? copy.primary : copy.secondary}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-5 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-6">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E]/45">
          <Layers3 className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-[#0E2A5C]">
            {copy.foundation}
          </h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-[#156240]/72">
            {copy.foundationBody}
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
