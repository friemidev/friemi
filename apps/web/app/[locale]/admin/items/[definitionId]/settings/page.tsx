import { notFound, redirect } from "next/navigation";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import {
  TicketGiftabilityButton,
  UpdateTicketImageForm,
} from "@/features/inventory/components/AdminTicketForms";
import { getInventoryCopy } from "@/features/inventory/copy";
import { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminItemSettingsPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}/settings`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const definition = await getAdminInventoryDefinition(definitionId);
  if (!definition || definition.kind !== "EVENT_TICKET") notFound();
  const copy = getInventoryCopy(locale);
  const itemCopy = getAdminItemCopy(locale);

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}`}
      backLabel={itemCopy.frame.backToDetail}
      compact
      definition={definition}
      locale={locale}
      pageTitle={itemCopy.settings.pageTitle}
    >
      <div className="space-y-5">
        <section className="rounded-2xl bg-paper p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">
            {itemCopy.settings.imageTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink/70">
            {itemCopy.settings.imageHint}
          </p>
          <div className="mt-5 max-w-xl">
            <UpdateTicketImageForm
              definitionId={definition.id}
              imageUrl={definition.imageUrl}
              locale={locale}
            />
          </div>
        </section>
        <section className="rounded-2xl bg-paper p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">
            {itemCopy.settings.giftingTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
            {copy.adminGiftSettingsHint}
          </p>
          <p className="mt-4 text-sm font-semibold text-ink">
            {definition.isGiftable
              ? itemCopy.settings.currentAllowed
              : itemCopy.settings.currentPaused}
          </p>
          <div className="mt-3">
            <TicketGiftabilityButton
              definitionId={definition.id}
              isGiftable={definition.isGiftable}
              locale={locale}
            />
          </div>
        </section>
      </div>
    </AdminItemPageFrame>
  );
}
