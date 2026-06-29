import { cn } from "@/lib/utils";

const coCreatorBadgeIcon = "/brand/v2_1/friemi-co-creator-badge.svg";

type CoCreatorIdentityBadgeProps = {
  className?: string;
  locale: string;
  variant?: "full" | "icon";
};

function getCoCreatorBadgeCopy(locale: string) {
  if (locale === "fr") {
    return {
      label: "Co-créateur Friemi",
      tooltip: "Identité de co-créateur Friemi",
    };
  }

  if (locale === "en") {
    return {
      label: "Friemi co-creator",
      tooltip: "Friemi co-creator identity",
    };
  }

  return {
    label: "共创主理人",
    tooltip: "Friemi 共创主理人",
  };
}

export function CoCreatorIdentityBadge({
  className,
  locale,
  variant = "full",
}: CoCreatorIdentityBadgeProps) {
  const copy = getCoCreatorBadgeCopy(locale);
  const isIconOnly = variant === "icon";

  return (
    <span
      className={cn("group/co-creator relative inline-flex w-fit", className)}
    >
      <button
        type="button"
        aria-label={copy.tooltip}
        title={copy.tooltip}
        className={cn(
          "group inline-flex max-w-full items-center rounded-full border border-[#8AB68E]/70 bg-[#FEFFF9]/90 text-xs font-semibold text-[#156240] shadow-[0_10px_24px_rgba(21,98,64,0.10)] outline-none transition hover:-translate-y-0.5 hover:border-[#369758] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#369758]/35",
          isIconOnly
            ? "h-7 w-7 justify-center p-0"
            : "min-h-8 gap-1.5 px-2.5 py-1 pr-3 sm:px-3",
        )}
      >
        <span
          className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
        >
          <img
            src={coCreatorBadgeIcon}
            alt=""
            aria-hidden="true"
            className="h-full w-full"
          />
        </span>
        {isIconOnly ? null : (
          <span className="min-w-0 truncate">{copy.label}</span>
        )}
      </button>

      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-[calc(100%+0.45rem)] z-30 whitespace-nowrap rounded-full border border-[#D6D5B2] bg-[#1D1D1B] px-3 py-1.5 text-[11px] font-semibold text-[#FEFFF9] opacity-0 shadow-[0_14px_36px_rgba(29,29,27,0.18)] transition duration-150",
          isIconOnly ? "left-1/2 -translate-x-1/2" : "left-0",
          "group-hover/co-creator:opacity-100 group-focus-within/co-creator:opacity-100",
        )}
      >
        {copy.tooltip}
      </span>
    </span>
  );
}
