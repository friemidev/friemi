import Link from "next/link";
import { ArrowUpRight, History, ImagePlus, ScanLine, Send } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminItemDetailPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const definition = await getAdminInventoryDefinition(definitionId);
  if (!definition || definition.kind !== "EVENT_TICKET") notFound();
  const copy = getAdminItemCopy(locale);
  const remaining = definition.totalSupply - definition.issuedCount;
  const links = [
    {
      description:
        remaining > 0 ? copy.detail.issueHint : copy.detail.issueEmptyHint,
      href: `/admin/items/${definitionId}/issue`,
      icon: Send,
      label: copy.detail.issueLabel,
    },
    {
      description: copy.detail.settingsHint,
      href: `/admin/items/${definitionId}/settings`,
      icon: ImagePlus,
      label: copy.detail.settingsLabel,
    },
    {
      description: copy.detail.historyHint,
      href: `/admin/items/tickets/${definitionId}`,
      icon: History,
      label: copy.detail.historyLabel,
    },
    {
      description: copy.detail.redeemHint,
      href: `/tickets/redeem?source=admin&definitionId=${encodeURIComponent(definitionId)}`,
      icon: ScanLine,
      label: copy.detail.redeemLabel,
    },
  ];

  return (
    <AdminItemPageFrame
      backHref="/admin/merchants?view=items"
      backLabel={copy.frame.backToList}
      definition={definition}
      locale={locale}
      pageTitle={copy.detail.pageTitle}
    >
      <nav
        aria-label={copy.detail.actionsAria}
        className="divide-y divide-sand/50 rounded-2xl bg-paper px-4 sm:px-5"
      >
        {links.map(({ description, href, icon: Icon, label }) => (
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
    </AdminItemPageFrame>
  );
}
