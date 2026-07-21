"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { ChevronRight, LogOut, Settings, ShieldCheck } from "lucide-react";
import { withLocale } from "@/lib/routes";

type AccountSettingsActionListProps = {
  accountSecurityLabel: string;
  accountSettingsLabel: string;
  locale: string;
  signOutLabel: string;
};

export function AccountSettingsActionList({
  accountSecurityLabel,
  accountSettingsLabel,
  locale,
  signOutLabel,
}: AccountSettingsActionListProps) {
  const { openUserProfile, signOut } = useClerk();

  return (
    <section className="space-y-1.5">
      <button
        className="group flex w-full items-center gap-3 rounded-[1.15rem] px-1 py-3.5 text-left transition hover:bg-[#FEFFF9]/72 active:scale-[0.99]"
        onClick={() => openUserProfile()}
        type="button"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F2EC] text-[#156240] ring-1 ring-[#D6D5B2]/62 transition group-hover:bg-[#FEFFF9]">
          <Settings className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-black text-[#1D1D1B]">
          {accountSettingsLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
      </button>

      <Link
        href={withLocale(locale, "/account/security")}
        className="group flex items-center gap-3 rounded-[1.15rem] px-1 py-3.5 transition hover:bg-[#FEFFF9]/72 active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F2EC] text-[#156240] ring-1 ring-[#D6D5B2]/62 transition group-hover:bg-[#FEFFF9]">
          <ShieldCheck className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-black text-[#1D1D1B]">
          {accountSecurityLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
      </Link>

      <button
        className="group flex w-full items-center gap-3 rounded-[1.15rem] px-1 py-3.5 text-left transition hover:bg-[#FFF5E6]/76 active:scale-[0.99]"
        onClick={() => {
          void signOut({ redirectUrl: withLocale(locale, "/") });
        }}
        type="button"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF5E6] text-[#B5301F] ring-1 ring-[#F09182]/42">
          <LogOut className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-black text-[#B5301F]">
          {signOutLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B5301F]/48 transition group-hover:translate-x-0.5" />
      </button>
    </section>
  );
}
