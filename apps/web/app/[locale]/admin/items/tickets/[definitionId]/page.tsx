import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import { getInventoryCopy } from "@/features/inventory/copy";
import {
  getAdminInventoryDefinition,
  getAdminTicketHistory,
} from "@/features/inventory/services/inventoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminTicketHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
  searchParams: Promise<{ issuePage?: string; page?: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/tickets/${definitionId}`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const { issuePage: rawIssuePage, page: rawPage } = await searchParams;
  const requestedPage = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1),
  );
  const requestedIssuePage = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawIssuePage ?? "1", 10) || 1),
  );
  const [data, definition] = await Promise.all([
    getAdminTicketHistory(definitionId, requestedPage, requestedIssuePage),
    getAdminInventoryDefinition(definitionId),
  ]);
  if (!data || !definition || definition.kind !== "EVENT_TICKET") notFound();
  const { issuePage, page } = data;

  const copy = getInventoryCopy(locale);
  const itemCopy = getAdminItemCopy(locale);
  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  const pageHref = (value: number) =>
    withLocale(
      locale,
      `/admin/items/tickets/${definitionId}?page=${value}&issuePage=${issuePage}`,
    );
  const issuePageHref = (value: number) =>
    withLocale(
      locale,
      `/admin/items/tickets/${definitionId}?page=${page}&issuePage=${value}`,
    );

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}`}
      backLabel={itemCopy.frame.backToDetail}
      compact
      definition={definition}
      locale={locale}
      pageTitle={itemCopy.detail.historyLabel}
    >
      <div className="rounded-2xl bg-paper px-4 sm:px-6">
        <section aria-labelledby="admin-allocations-heading" className="py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              className="text-base font-bold text-ink sm:text-lg"
              id="admin-allocations-heading"
            >
              {copy.adminIssueHistory}
            </h2>
            <span className="text-sm font-semibold tabular-nums text-ink/70">
              {data.issueCount}
            </span>
          </div>
          {data.issueBatches.length ? (
            <ol className="mt-4 divide-y divide-sand/60 border-t border-sand/60">
              {data.issueBatches.map((batch) => (
                <li className="space-y-2 py-4" key={batch.id}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-semibold text-ink">
                      {copy.adminHistoryAllocationTo(batch.recipient.nickname)}
                    </p>
                    <span className="shrink-0 rounded-full bg-fog px-2.5 py-1 text-xs font-bold tabular-nums text-forest">
                      {copy.adminHistoryTicketCount(batch.quantity)}
                    </span>
                  </div>
                  {batch.recipient.friendCode ? (
                    <p className="text-sm text-ink/70">
                      {copy.methodCode} {batch.recipient.friendCode}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-ink/70">
                    <span>{copy.adminHistoryBy(batch.actor.nickname)}</span>
                    <time
                      className="ml-auto tabular-nums"
                      dateTime={batch.createdAt.toISOString()}
                    >
                      {formatDate(batch.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 border-t border-sand/60 py-4 text-sm text-ink/70">
              {copy.adminIssueEmpty}
            </p>
          )}
          {data.issueCount > data.pageSize ? (
            <nav
              aria-label={copy.adminIssueHistory}
              className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
            >
              {issuePage > 1 ? (
                <Link
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-forest"
                  href={issuePageHref(issuePage - 1)}
                >
                  {copy.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs tabular-nums text-ink/70">
                {itemCopy.list.pageNumber(
                  issuePage,
                  Math.ceil(data.issueCount / data.pageSize),
                )}
              </span>
              {issuePage * data.pageSize < data.issueCount ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-self-end text-sm font-semibold text-forest"
                  href={issuePageHref(issuePage + 1)}
                >
                  {copy.next}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>

        <section
          aria-labelledby="account-gifts-heading"
          className="border-t border-sand/60 py-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              className="text-base font-bold text-ink sm:text-lg"
              id="account-gifts-heading"
            >
              {copy.adminGiftHistory}
            </h2>
            <span className="text-sm font-semibold tabular-nums text-ink/70">
              {data.giftCount}
            </span>
          </div>
          {data.gifts.length ? (
            <ol className="mt-4 divide-y divide-sand/60 border-t border-sand/60">
              {data.gifts.map((gift) => (
                <li className="space-y-2 py-4" key={gift.id}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-semibold text-ink">
                      {gift.sender.nickname} → {gift.recipient.nickname}
                    </p>
                    <span className="shrink-0 rounded-full bg-fog px-2.5 py-1 text-xs font-bold tabular-nums text-forest">
                      {copy.adminHistoryTicketCount(1)}
                    </span>
                  </div>
                  {gift.sender.friendCode && gift.recipient.friendCode ? (
                    <p className="text-sm text-ink/70">
                      {copy.methodCode} {gift.sender.friendCode} →{" "}
                      {gift.recipient.friendCode}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-ink/70">
                    <span>
                      {gift.method === "FRIEND_QR"
                        ? copy.methodQr
                        : copy.methodCode}
                    </span>
                    <time
                      className="ml-auto tabular-nums"
                      dateTime={gift.createdAt.toISOString()}
                    >
                      {formatDate(gift.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 border-t border-sand/60 py-4 text-sm text-ink/70">
              {copy.adminGiftEmpty}
            </p>
          )}
          {data.giftCount > data.pageSize ? (
            <nav
              aria-label={copy.adminGiftHistory}
              className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
            >
              {page > 1 ? (
                <Link
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-forest"
                  href={pageHref(page - 1)}
                >
                  {copy.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs tabular-nums text-ink/70">
                {itemCopy.list.pageNumber(
                  page,
                  Math.ceil(data.giftCount / data.pageSize),
                )}
              </span>
              {page * data.pageSize < data.giftCount ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-self-end text-sm font-semibold text-forest"
                  href={pageHref(page + 1)}
                >
                  {copy.next}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </AdminItemPageFrame>
  );
}
