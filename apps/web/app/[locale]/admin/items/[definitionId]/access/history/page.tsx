import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { getAdminTicketAccessCopy } from "@/features/inventory/adminTicketAccessCopy";
import { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { getTicketRedemptionHistory } from "@/features/inventory/services/ticketRedemptionHistoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminTicketRedemptionHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { definitionId, locale } = await params;
  const { page: requestedPage } = await searchParams;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}/access/history`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${definitionId}/access/history`,
  );
  if (actor.status !== "ACTIVE") redirect(withLocale(locale, "/"));
  const [definition, history] = await Promise.all([
    getAdminInventoryDefinition(definitionId),
    getTicketRedemptionHistory({
      actorProfileId: actor.id,
      definitionId,
      isAdmin: true,
      page: Number(requestedPage ?? "1"),
    }),
  ]);
  if (!definition || definition.kind !== "EVENT_TICKET" || !history) notFound();
  const copy = getAdminTicketAccessCopy(locale);
  const pages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const path = `/admin/items/${definitionId}/access/history`;

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}/access`}
      backLabel={getAdminItemCopy(locale).access.pageTitle}
      compact
      definition={definition}
      locale={locale}
      pageTitle={copy.historyTitle}
    >
      <section className="rounded-2xl bg-paper px-5 py-5 sm:px-6">
        <p className="text-sm text-ink/60">{copy.historyCount(history.total)}</p>
        {history.records.length ? (
          <ol className="mt-4 divide-y divide-sand/60">
            {history.records.map((record) => (
              <li className="py-4 first:pt-0 last:pb-0" key={record.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold text-ink">
                    {copy.holder(record.holder.nickname)}
                  </p>
                  <time className="text-xs tabular-nums text-ink/60" dateTime={record.redeemedAt}>
                    {dateFormat.format(new Date(record.redeemedAt))}
                  </time>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink/65">
                  <span>{copy.redeemedBy(record.redeemer.nickname)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {record.method === "QR"
                      ? copy.methodQr
                      : record.method === "MANUAL"
                        ? copy.methodManual
                        : copy.methodUnknown}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-ink/65">{copy.historyEmpty}</p>
        )}
      </section>
      {pages > 1 ? (
        <nav className="flex items-center justify-between gap-3 text-sm font-semibold text-forest" aria-label={copy.historyTitle}>
          {history.page > 1 ? (
            <Link href={withLocale(locale, `${path}?page=${history.page - 1}`)}>{copy.previous}</Link>
          ) : <span />}
          <span className="text-ink/60">{copy.page(history.page, pages)}</span>
          {history.page < pages ? (
            <Link href={withLocale(locale, `${path}?page=${history.page + 1}`)}>{copy.next}</Link>
          ) : <span />}
        </nav>
      ) : null}
    </AdminItemPageFrame>
  );
}
