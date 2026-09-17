"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  ChevronRight,
  LogOut,
  Newspaper,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TicketCheck,
} from "lucide-react";
import { withLocale } from "@/lib/routes";

const actionIconClassName =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F2EC] text-[#156240] ring-1 ring-[#D6D5B2]/62 transition group-hover:bg-[#FEFFF9]";

type AccountSettingsActionListProps = {
  accountSecurityLabel: string;
  accountSettingsLabel: string;
  adminActivityPriorityLabel?: string;
  adminCouponMerchantLabel?: string;
  adminOfficialMessagesLabel?: string;
  locale: string;
  signOutLabel: string;
};

export function AccountSettingsActionList({
  accountSecurityLabel,
  accountSettingsLabel,
  adminActivityPriorityLabel,
  adminCouponMerchantLabel,
  adminOfficialMessagesLabel,
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
        <span className={actionIconClassName}>
          <Settings className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-[#1D1D1B]">
          {accountSettingsLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
      </button>

      <Link
        href={withLocale(locale, "/account/security")}
        className="group flex items-center gap-3 rounded-[1.15rem] px-1 py-3.5 transition hover:bg-[#FEFFF9]/72 active:scale-[0.99]"
      >
        <span className={actionIconClassName}>
          <ShieldCheck className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-[#1D1D1B]">
          {accountSecurityLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
      </Link>

      {adminOfficialMessagesLabel ? (
        <Link
          href={withLocale(locale, "/admin/official-messages")}
          className="group flex items-center gap-3 rounded-[1.15rem] px-1 py-3.5 transition hover:bg-[#FEFFF9]/72 active:scale-[0.99]"
        >
          <span className={actionIconClassName}>
            <Newspaper className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-bold text-[#1D1D1B]">
            {adminOfficialMessagesLabel}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
        </Link>
      ) : null}

      {adminActivityPriorityLabel ? (
        <Link
          href={withLocale(locale, "/admin/activity-priority")}
          className="group flex items-center gap-3 rounded-[1.15rem] px-1 py-3.5 transition hover:bg-[#FEFFF9]/72 active:scale-[0.99]"
        >
          <span className={actionIconClassName}>
            <SlidersHorizontal className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-bold text-[#1D1D1B]">
            {adminActivityPriorityLabel}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
        </Link>
      ) : null}

      {adminCouponMerchantLabel ? (
        <Link
          href={withLocale(locale, "/admin/merchants")}
          className="group flex items-center gap-3 rounded-[1.15rem] px-1 py-3.5 transition hover:bg-[#FEFFF9]/72 active:scale-[0.99]"
        >
          <span className={actionIconClassName}>
            <TicketCheck className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-bold text-[#1D1D1B]">
            {adminCouponMerchantLabel}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#8E8383]/62 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
        </Link>
      ) : null}

      <button
        className="group flex w-full items-center gap-3 rounded-[1.15rem] px-1 py-3.5 text-left transition hover:bg-[#FFF5E6]/76 active:scale-[0.99]"
        onClick={() => {
          void signOut({ redirectUrl: withLocale(locale, "/") });
        }}
        type="button"
      >
        <span className={actionIconClassName}>
          <LogOut className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-[#B5301F]">
          {signOutLabel}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B5301F]/48 transition group-hover:translate-x-0.5" />
      </button>
    </section>
  );
}
