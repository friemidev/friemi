import Link from "next/link";
import { Gamepad2 } from "lucide-react";

type BoardGameToolFloatingEntryProps = {
  gameToolsHref: string;
  locale: string;
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

export function BoardGameToolFloatingEntry({
  gameToolsHref,
  locale,
}: BoardGameToolFloatingEntryProps) {
  const label = getLabel(locale);

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
