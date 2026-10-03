import Link from "next/link";
import { ArrowUpRight, MapPin, UsersRound } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getNowCopy, getNowKind, isNowVisible } from "./now";

type NowInviteRowProps = {
  invite: {
    id: string;
    category: string;
    title: string;
    area: string;
    expiresAt: Date;
    _count: { interests: number };
  };
  locale: string;
};

export function NowInviteRow({ invite, locale }: NowInviteRowProps) {
  const copy = getNowCopy(locale);
  const kind = getNowKind(invite.category);
  const active = isNowVisible(invite.expiresAt);
  return (
    <Link
      href={withLocale(locale, `/now/${invite.id}`)}
      className="group flex min-h-[6.4rem] items-center gap-3.5 rounded-[1.35rem] border border-[#E1EBE2] bg-white px-3.5 py-3 shadow-[0_6px_18px_rgba(19,75,50,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(19,75,50,.1)] active:scale-[.99]"
    >
      <span
        className="grid h-[4.6rem] w-[4.6rem] shrink-0 place-items-center rounded-full border-[5px] border-[#BCE8CF] bg-[#EEF9F1] text-[2rem] shadow-inner"
        aria-hidden="true"
      >
        {kind.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-[#173D32]">
          {invite.title}
        </span>
        <span className="mt-1 flex items-center gap-1 truncate text-[12px] text-[#60746A]">
          <MapPin size={12} aria-hidden="true" />
          {invite.area}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-[#24815D]">
          <UsersRound size={12} aria-hidden="true" />
          {invite._count.interests} {copy.people}
        </span>
        {!active ? (
          <span className="mt-1 block text-[11px] text-[#9A6C71]">
            {copy.expired}
          </span>
        ) : null}
      </span>
      <ArrowUpRight
        size={18}
        className="shrink-0 text-[#468063] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
