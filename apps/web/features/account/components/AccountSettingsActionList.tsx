"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  BarChart3,
  ChevronRight,
  Flag,
  Languages,
  LogOut,
  Newspaper,
  PackageOpen,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  type LucideIcon,
} from "lucide-react";
import { withLocale } from "@/lib/routes";
import { OfficialFeedbackDialog } from "@/features/official-messages/components/OfficialFeedbackDialog";
import { getChildSafetyCopy } from "@/features/reports/childSafetyCopy";

type AccountSettingsActionListProps = {
  accountGroupLabel: string;
  accountSecurityLabel: string;
  accountSecurityHint: string;
  accountSettingsLabel: string;
  accountSettingsHint: string;
  adminActivityPriorityLabel?: string;
  adminActivityPriorityHint?: string;
  adminAnalyticsLabel?: string;
  adminAnalyticsHint?: string;
  adminMerchantLabel?: string;
  adminMerchantHint?: string;
  adminItemLabel?: string;
  adminItemHint?: string;
  adminGroupLabel: string;
  adminOfficialMessagesLabel?: string;
  adminOfficialMessagesHint?: string;
  adminReportsLabel?: string;
  adminReportsHint?: string;
  languageLabel: string;
  languageHint: string;
  locale: string;
  signOutLabel: string;
};

const rowClassName =
  "group flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

function RowContent({
  danger = false,
  hint,
  icon: Icon,
  label,
}: {
  danger?: boolean;
  hint?: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${danger ? "bg-rose/20 text-danger" : "bg-fog text-forest"}`}
      >
        <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${danger ? "text-danger" : "text-ink"}`}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-5 text-ink/65">
            {hint}
          </span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-outline transition group-hover:translate-x-0.5"
      />
    </>
  );
}

export function AccountSettingsActionList({
  accountGroupLabel,
  accountSecurityLabel,
  accountSecurityHint,
  accountSettingsLabel,
  accountSettingsHint,
  adminActivityPriorityLabel,
  adminActivityPriorityHint,
  adminAnalyticsLabel,
  adminAnalyticsHint,
  adminMerchantLabel,
  adminMerchantHint,
  adminItemLabel,
  adminItemHint,
  adminGroupLabel,
  adminOfficialMessagesLabel,
  adminOfficialMessagesHint,
  adminReportsLabel,
  adminReportsHint,
  languageLabel,
  languageHint,
  locale,
  signOutLabel,
}: AccountSettingsActionListProps) {
  const { openUserProfile, signOut } = useClerk();
  const safety = getChildSafetyCopy(locale);

  return (
    <div className="space-y-8">
      <section aria-labelledby="account-settings-account-heading">
        <h2
          className="mb-2 px-2 text-sm font-bold text-ink/70"
          id="account-settings-account-heading"
        >
          {accountGroupLabel}
        </h2>
        <div className="space-y-0.5">
          <button
            className={rowClassName}
            onClick={() => openUserProfile()}
            type="button"
          >
            <RowContent
              hint={accountSettingsHint}
              icon={Settings}
              label={accountSettingsLabel}
            />
          </button>
          <Link
            className={rowClassName}
            href={withLocale(locale, "/account/settings/language")}
          >
            <RowContent
              hint={languageHint}
              icon={Languages}
              label={languageLabel}
            />
          </Link>
          <Link
            className={rowClassName}
            href={withLocale(locale, "/account/security")}
          >
            <RowContent
              hint={accountSecurityHint}
              icon={ShieldCheck}
              label={accountSecurityLabel}
            />
          </Link>
        </div>
      </section>

      <section id="feedback" aria-label={safety.feedback}>
        <OfficialFeedbackDialog locale={locale} />
        <Link
          className={rowClassName}
          href={withLocale(locale, "/safety#child-safety")}
        >
          <RowContent icon={ShieldCheck} label={safety.standards} />
        </Link>
      </section>

      {adminAnalyticsLabel ||
      adminReportsLabel ||
      adminOfficialMessagesLabel ||
      adminActivityPriorityLabel ||
      adminMerchantLabel ||
      adminItemLabel ? (
        <section aria-labelledby="account-settings-admin-heading">
          <h2
            className="mb-2 px-2 text-sm font-bold text-ink/70"
            id="account-settings-admin-heading"
          >
            {adminGroupLabel}
          </h2>
          <div className="space-y-0.5">
            {adminMerchantLabel ? (
              <Link
                className={rowClassName}
                href={withLocale(locale, "/admin/merchants")}
              >
                <RowContent
                  hint={adminMerchantHint}
                  icon={Store}
                  label={adminMerchantLabel}
                />
              </Link>
            ) : null}
            {adminItemLabel ? (
              <Link
                className={rowClassName}
                href={withLocale(locale, "/admin/merchants?view=items")}
              >
                <RowContent
                  hint={adminItemHint}
                  icon={PackageOpen}
                  label={adminItemLabel}
                />
              </Link>
            ) : null}
            {adminActivityPriorityLabel ? (
              <Link
                className={rowClassName}
                href={withLocale(locale, "/admin/activity-priority")}
              >
                <RowContent
                  hint={adminActivityPriorityHint}
                  icon={SlidersHorizontal}
                  label={adminActivityPriorityLabel}
                />
              </Link>
            ) : null}
            {adminOfficialMessagesLabel ? (
              <Link
                className={rowClassName}
                href={withLocale(locale, "/admin/official-messages")}
              >
                <RowContent
                  hint={adminOfficialMessagesHint}
                  icon={Newspaper}
                  label={adminOfficialMessagesLabel}
                />
              </Link>
            ) : null}
            {adminAnalyticsLabel ? (
              <Link
                className={rowClassName}
                href={withLocale(locale, "/admin/analytics")}
              >
                <RowContent
                  hint={adminAnalyticsHint}
                  icon={BarChart3}
                  label={adminAnalyticsLabel}
                />
              </Link>
            ) : null}
            {adminReportsLabel ? (
              <Link
                className={rowClassName}
                href={withLocale(locale, "/admin/reports")}
              >
                <RowContent
                  hint={adminReportsHint}
                  icon={Flag}
                  label={adminReportsLabel}
                />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <button
        className={rowClassName}
        onClick={() => {
          void signOut({ redirectUrl: withLocale(locale, "/") });
        }}
        type="button"
      >
        <RowContent danger icon={LogOut} label={signOutLabel} />
      </button>
    </div>
  );
}
