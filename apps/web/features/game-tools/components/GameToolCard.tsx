import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import {
  getGameToolLabel,
  type GameToolDefinition,
} from "@/features/game-tools/gameToolCatalog";
import { withLocale } from "@/lib/routes";

type GameToolCardProps = {
  tool: GameToolDefinition;
  locale: string;
  available: boolean;
  description?: string;
  minPlayers?: number;
  compact?: boolean;
  headingLevel?: 2 | 3;
  target?: "_top";
};

export function GameToolCard({
  tool,
  locale,
  available,
  description,
  minPlayers = tool.minPlayers,
  compact = false,
  headingLevel = 3,
  target,
}: GameToolCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const CardLink = tool.kind === "DICE" ? "a" : Link;
  const illustrated = ["DRAW_GUESS", "DICE", "UNO"].includes(tool.kind);
  const playerLabel = locale === "fr" ? "joueurs" : locale === "en" ? "players" : "人";
  const comingLabel = locale === "fr" ? "Bientôt" : locale === "en" ? "Soon" : "敬请期待";
  const cardClassName = "group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.3rem] border border-sand/75 bg-white text-ink shadow-sm";
  const content = (
    <>
      <div className={`relative w-full shrink-0 bg-fog/70 ${compact ? "aspect-[2/1]" : "aspect-[8/5]"}`}>
        <Image
          alt=""
          className={illustrated ? "object-contain p-3 sm:p-4" : "object-cover"}
          fill
          priority={tool.kind === "WEREWOLF"}
          sizes={compact ? "(max-width: 640px) calc(50vw - 40px), 192px" : "(max-width: 768px) calc(50vw - 26px), (max-width: 1024px) calc(50vw - 64px), 320px"}
          src={tool.imageSrc}
        />
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-3 sm:p-4"}`}>
        <div className="flex items-start justify-between gap-1.5">
          <Heading className="min-w-0 break-words text-[16px] font-bold leading-snug sm:text-[18px]">
            {getGameToolLabel(tool.title, locale)}
          </Heading>
          {available ? <ArrowUpRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> : null}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-[1.5] text-ink/70 sm:text-[13px]">
          {description ?? getGameToolLabel(tool.description, locale)}
        </p>
        {!compact ? (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-3 text-[11px] font-semibold leading-4 sm:text-xs">
            <span className="text-forest">
              {minPlayers === tool.maxPlayers ? minPlayers : `${minPlayers}–${tool.maxPlayers}`} {playerLabel}
            </span>
            {!available ? (
              <span className="inline-flex items-center gap-1 text-ink/70">
                <LockKeyhole aria-hidden="true" className="h-3 w-3" />
                {comingLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  return available ? (
    <CardLink
      className={`${cardClassName} transition-[transform,border-color,box-shadow] duration-150 hover:border-meadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 active:translate-y-0.5 motion-reduce:transition-none`}
      data-game-tool={tool.kind}
      href={withLocale(locale, tool.href)}
      target={target}
    >
      {content}
    </CardLink>
  ) : (
    <div aria-disabled="true" className={cardClassName} data-game-tool={tool.kind}>
      {content}
    </div>
  );
}
