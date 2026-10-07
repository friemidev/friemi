import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  TicketCheck,
  UserRoundPlus,
} from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantSummary } from "@/components/admin/MerchantManagementClient";
import { getMerchantAdminCopy } from "@/components/admin/merchantAdminCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import type { AdminMerchantListItem } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export function MerchantDetailView({
  locale,
  merchant,
}: {
  locale: string;
  merchant: AdminMerchantListItem;
}) {
  const copy = getMerchantAdminCopy(locale);
  const actions = [
    {
      description: copy.detail.couponsHint,
      href: `/admin/merchants/${merchant.id}/coupons`,
      icon: TicketCheck,
      label: copy.detail.coupons,
    },
    ...(!merchant.owner
      ? [
          {
            description: copy.detail.bindOwnerHint,
            href: `/admin/merchants/upgrade?merchantId=${encodeURIComponent(merchant.id)}`,
            icon: UserRoundPlus,
            label: copy.detail.bindOwner,
          },
        ]
      : []),
    {
      description: copy.detail.publicHint,
      href: `/merchants/${merchant.slug}`,
      icon: ExternalLink,
      label: copy.common.publicPage,
    },
  ];

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-5xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel={copy.common.backToList}
        title={copy.detail.pageTitle}
      />

      <MerchantSummary locale={locale} merchant={merchant} />

      <nav
        aria-label={copy.detail.actionsAria}
        className="divide-y divide-sand/50 rounded-2xl bg-paper px-4 sm:px-5"
      >
        {actions.map(({ description, href, icon: Icon, label }) => (
          <Link
            className="group flex min-h-24 items-center gap-4 py-4 focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, href)}
            key={href}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fog text-forest">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-ink group-hover:text-forest">
                {label}
              </span>
              <span className="mt-1 block text-sm leading-5 text-ink/70">
                {description}
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-ink/50 group-hover:text-forest"
            />
          </Link>
        ))}
      </nav>
    </PageContainer>
  );
}
