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
    <section className="overflow-hidden rounded-[1rem] bg-white px-4 shadow-[0_12px_30px_rgba(17,18,16,0.05)] ring-1 ring-[#F0EDE2]">
      <button
        className="flex w-full items-center gap-3 border-b border-[#EEF0EA] px-1 py-4 text-left"
        onClick={() => openUserProfile()}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8B907F]">
          <Settings className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-[#1D1D1B]">
          {accountSettingsLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B8BBAE]" />
      </button>

      <Link
        href={withLocale(locale, "/account/security")}
        className="flex items-center gap-3 border-b border-[#EEF0EA] px-1 py-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8B907F]">
          <ShieldCheck className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-[#1D1D1B]">
          {accountSecurityLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B8BBAE]" />
      </Link>

      <button
        className="flex w-full items-center gap-3 px-1 py-4 text-left"
        onClick={() => {
          void signOut({ redirectUrl: withLocale(locale, "/") });
        }}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1F1] text-[#9A2135]">
          <LogOut className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-[#9A2135]">
          {signOutLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8B907F]" />
      </button>
    </section>
  );
}
