import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import { IssueTicketForm } from "@/features/inventory/components/AdminTicketForms";
import { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminItemIssuePage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}/issue`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const definition = await getAdminInventoryDefinition(definitionId);
  if (!definition || definition.kind !== "EVENT_TICKET") notFound();
  const copy = getAdminItemCopy(locale);
  const remaining = definition.totalSupply - definition.issuedCount;

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}`}
      backLabel={copy.frame.backToDetail}
      compact
      definition={definition}
      locale={locale}
      pageTitle={copy.issue.pageTitle}
    >
      <section className="rounded-2xl bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">{copy.issue.formTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/70">
          {remaining > 0 ? copy.issue.formHint : copy.issue.soldOutHint}
        </p>
        <div className="mt-5 max-w-xl">
          <IssueTicketForm
            definitionId={definition.id}
            initialRequestId={randomUUID()}
            locale={locale}
            remaining={remaining}
            ticketTitle={definition.title}
          />
        </div>
      </section>
    </AdminItemPageFrame>
  );
}
