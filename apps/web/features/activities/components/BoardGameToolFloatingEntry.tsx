import Link from "next/link";
import { Gamepad2 } from "lucide-react";

type BoardGameToolFloatingEntryProps = {
  gameToolsHref: string;
  locale: string;
  variant?: "floating" | "tool";
};

function getLabel(locale: string) {
  if (locale === "fr") {
    return "Ouvrir les outils de jeux de société";
  }

  if (locale === "en") {
    return "Open board game tools";
  }

  return "进入桌游工具";
}

function getShortLabel(locale: string) {
  if (locale === "fr") return "Jeux";
  if (locale === "en") return "Games";

  return "桌游";
}

export function BoardGameToolFloatingEntry({
  gameToolsHref,
  locale,
  variant = "floating",
}: BoardGameToolFloatingEntryProps) {
  const label = getLabel(locale);

  if (variant === "tool") {
    return (
      <Link
        aria-label={label}
        className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[#607268] transition hover:bg-[#F2F8F3] hover:text-[#156240] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758] active:scale-[0.97]"
        href={gameToolsHref}
        target="_top"
        title={label}
      >
        <span className="flex h-6 w-6 items-center justify-center text-[#5C8A6C] transition group-hover:text-[#156240]">
          <Gamepad2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="max-w-full truncate">{getShortLabel(locale)}</span>
      </Link>
    );
  }

  return (
    <Link
      aria-label={label}
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 z-[55] grid h-14 w-14 place-items-center rounded-full border border-[#8AB68E] bg-white text-[#156240] shadow-[0_18px_42px_rgba(21,98,64,0.22)] transition hover:-translate-y-0.5 hover:border-[#156240] active:scale-[0.96] md:bottom-8 md:left-8"
      href={gameToolsHref}
      title={label}
    >
      <Gamepad2 className="h-6 w-6" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
