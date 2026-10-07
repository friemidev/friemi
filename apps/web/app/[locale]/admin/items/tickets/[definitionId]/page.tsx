import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getInventoryCopy } from "@/features/inventory/copy";
import { getAdminTicketHistory } from "@/features/inventory/services/inventoryService";
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
  const page = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1),
  );
  const issuePage = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawIssuePage ?? "1", 10) || 1),
  );
  const data = await getAdminTicketHistory(definitionId, page, issuePage);
  if (!data) notFound();

  const copy = getInventoryCopy(locale);
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
    <PageContainer className="merchant-admin-page app-mobile-page-shell max-w-4xl space-y-6 pb-14 pt-3 max-md:px-4 md:py-10">
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        href={withLocale(
          locale,
          `/admin/merchants?view=items&ticket=${encodeURIComponent(definitionId)}`,
        )}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {copy.admin}
      </Link>
      <header className="rounded-2xl bg-forest p-5 text-paper sm:p-6">
        <h1 className="text-2xl font-bold">{data.definition.title}</h1>
        <p className="mt-3 text-sm text-paper/85">
          {copy.supply} {data.definition.totalSupply} · {copy.remaining}{" "}
          {data.definition.totalSupply - data.definition.issuedCount}
        </p>
      </header>

      <section className="rounded-2xl bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">
          {copy.adminIssueHistory} · {data.issueCount}
        </h2>
        {data.issueBatches.length ? (
          <ol className="mt-5 space-y-4">
            {data.issueBatches.map((batch) => (
              <li
                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                key={batch.id}
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {batch.recipient.nickname} · {batch.recipient.friendCode}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">
                    {batch.actor.nickname} · {copy.quantity} {batch.quantity}
                  </p>
                </div>
                <time
                  className="text-sm text-ink/70 sm:shrink-0"
                  dateTime={batch.createdAt.toISOString()}
                >
                  {formatDate(batch.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-ink/70">{copy.adminIssueEmpty}</p>
        )}
        {data.issueCount > data.pageSize ? (
          <nav
            aria-label={copy.adminIssueHistory}
            className="mt-5 flex justify-between border-t border-sand/50 pt-3"
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
            {issuePage * data.pageSize < data.issueCount ? (
              <Link
                className="inline-flex min-h-11 items-center text-sm font-semibold text-forest"
                href={issuePageHref(issuePage + 1)}
              >
                {copy.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>

      <section className="rounded-2xl bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">
          {copy.giftHistory} · {data.giftCount}
        </h2>
        {data.gifts.length ? (
          <ol className="mt-5 space-y-4">
            {data.gifts.map((gift) => (
              <li
                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                key={gift.id}
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {gift.sender.nickname} → {gift.recipient.nickname}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">
                    {gift.sender.friendCode} → {gift.recipient.friendCode} ·{" "}
                    {copy.serial} {gift.item.serialNumber} ·{" "}
                    {gift.method === "FRIEND_QR"
                      ? copy.methodQr
                      : copy.methodCode}
                  </p>
                </div>
                <time
                  className="text-sm text-ink/70 sm:shrink-0"
                  dateTime={gift.createdAt.toISOString()}
                >
                  {formatDate(gift.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-ink/70">{copy.historyEmpty}</p>
        )}
        {data.giftCount > data.pageSize ? (
          <nav
            aria-label={copy.giftHistory}
            className="mt-5 flex justify-between border-t border-sand/50 pt-3"
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
            {page * data.pageSize < data.giftCount ? (
              <Link
                className="inline-flex min-h-11 items-center text-sm font-semibold text-forest"
                href={pageHref(page + 1)}
              >
                {copy.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </PageContainer>
  );
}
