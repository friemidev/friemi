import Link from "next/link";
import { ArrowUpRight, History, UserRoundCheck, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import { AdminTicketMerchantForm } from "@/features/inventory/components/AdminTicketMerchantForm";
import { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchantOptions } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminTicketAccessPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}/access`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const [definition, activeMerchants] = await Promise.all([
    getAdminInventoryDefinition(definitionId),
    getAdminMerchantOptions(),
  ]);
  if (!definition || definition.kind !== "EVENT_TICKET") notFound();
  const merchants = [...activeMerchants];
  if (
    definition.merchant &&
    !merchants.some((merchant) => merchant.id === definition.merchant?.id)
  ) {
    merchants.push({
      city: "",
      id: definition.merchant.id,
      name: definition.merchant.name,
      slug: "",
    });
  }
  const copy = getAdminItemCopy(locale);
  const links = [
    {
      href: `/admin/items/${definitionId}/access/managers`,
      icon: UserRoundCheck,
      label: copy.access.managersLabel,
      hint: copy.access.managersHint,
    },
    {
      href: `/admin/items/${definitionId}/access/staff`,
      icon: Users,
      label: copy.access.staffLabel,
      hint: copy.access.staffHint,
    },
    {
      href: `/admin/items/${definitionId}/access/history`,
      icon: History,
      label: copy.access.redemptionsLabel,
      hint: copy.access.redemptionsHint,
    },
  ];

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}`}
      backLabel={copy.frame.backToDetail}
      compact
      definition={definition}
      locale={locale}
      pageTitle={copy.access.pageTitle}
    >
      <section className="rounded-2xl bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">{copy.access.merchantTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/70">
          {copy.access.merchantHint}
        </p>
        <AdminTicketMerchantForm
          definitionId={definitionId}
          locale={locale}
          merchantId={definition.merchantId}
          merchants={merchants}
        />
      </section>
      <nav className="divide-y divide-sand/60 rounded-2xl bg-paper px-5 sm:px-6">
        {links.map(({ href, hint, icon: Icon, label }) => (
          <Link
            className="flex min-h-20 items-center gap-4 py-4 focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, href)}
            key={href}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fog text-forest">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{label}</span>
              <span className="mt-0.5 block text-sm leading-5 text-ink/70">
                {hint}
              </span>
            </span>
            <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink/50" />
          </Link>
        ))}
      </nav>
    </AdminItemPageFrame>
  );
}
