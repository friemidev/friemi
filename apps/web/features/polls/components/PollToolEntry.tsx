import Link from "next/link";
import { Vote } from "lucide-react";

type PollToolEntryProps = {
  href: string;
  locale: string;
  openCount?: number;
};

function getLabel(locale: string) {
  if (locale === "fr") return "Sondages";
  if (locale === "en") return "Polls";
  return "投票";
}

export function PollToolEntry({
  href,
  locale,
  openCount = 0,
}: PollToolEntryProps) {
  const label = getLabel(locale);

  return (
    <Link
      aria-label={label}
      className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[#607268] transition hover:bg-[#F2F8F3] hover:text-[#156240] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758] active:scale-[0.97]"
      href={href}
      target="_top"
      title={label}
    >
      <span className="relative flex h-6 w-6 items-center justify-center text-[#5C8A6C] transition group-hover:text-[#156240]">
        <Vote className="h-[18px] w-[18px]" aria-hidden="true" />
        {openCount > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
            {openCount > 9 ? "9+" : openCount}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
