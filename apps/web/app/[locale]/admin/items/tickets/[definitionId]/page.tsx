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
    <PageContainer className="max-w-3xl space-y-5 pb-28 pt-5 md:pb-12 md:pt-10">
      <Link
        className="inline-flex items-center gap-2 text-sm font-bold text-[#156240]"
        href={withLocale(
          locale,
          `/admin/merchants?view=items&ticket=${encodeURIComponent(definitionId)}`,
        )}
      >
        <ArrowLeft className="h-4 w-4" /> {copy.admin}
      </Link>
      <header className="rounded-[1.3rem] bg-[#143E2A] p-6 text-white">
        <p className="text-xs font-bold tracking-[0.12em] text-[#CDE8CF]">
          FRIEMI ADMIN
        </p>
        <h1 className="mt-2 text-2xl font-black">{data.definition.title}</h1>
        <p className="mt-3 text-sm text-white/75">
          {copy.supply} {data.definition.totalSupply} · {copy.remaining}{" "}
          {data.definition.totalSupply - data.definition.issuedCount}
        </p>
      </header>

      <section className="rounded-[1.3rem] bg-white p-5 ring-1 ring-[#D6D5B2]">
        <h2 className="text-lg font-bold text-[#111210]">{copy.issue}</h2>
        <ol className="mt-4 divide-y divide-[#E5E2D3]">
          {data.issueBatches.map((batch) => (
            <li
              className="flex items-start justify-between gap-3 py-3"
              key={batch.id}
            >
              <div>
                <p className="text-sm font-bold text-[#111210]">
                  {batch.recipient.nickname} · {batch.recipient.friendCode}
                </p>
                <p className="mt-1 text-xs text-[#6C746A]">
                  {batch.actor.nickname} · {copy.quantity} {batch.quantity}
                </p>
              </div>
              <time
                className="shrink-0 text-xs text-[#6C746A]"
                dateTime={batch.createdAt.toISOString()}
              >
                {formatDate(batch.createdAt)}
              </time>
            </li>
          ))}
        </ol>
        {data.issueCount > data.pageSize ? (
          <nav
            aria-label={copy.issue}
            className="mt-5 flex justify-between border-t border-[#E5E2D3] pt-4"
          >
            {issuePage > 1 ? (
              <Link
                className="text-sm font-bold text-[#156240]"
                href={issuePageHref(issuePage - 1)}
              >
                {copy.previous}
              </Link>
            ) : (
              <span />
            )}
            {issuePage * data.pageSize < data.issueCount ? (
              <Link
                className="text-sm font-bold text-[#156240]"
                href={issuePageHref(issuePage + 1)}
              >
                {copy.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>

      <section className="rounded-[1.3rem] bg-white p-5 ring-1 ring-[#D6D5B2]">
        <h2 className="text-lg font-bold text-[#111210]">
          {copy.giftHistory} · {data.giftCount}
        </h2>
        {data.gifts.length ? (
          <ol className="mt-4 divide-y divide-[#E5E2D3]">
            {data.gifts.map((gift) => (
              <li
                className="flex items-start justify-between gap-3 py-3"
                key={gift.id}
              >
                <div>
                  <p className="text-sm font-bold text-[#111210]">
                    {gift.sender.nickname} → {gift.recipient.nickname}
                  </p>
                  <p className="mt-1 text-xs text-[#6C746A]">
                    {gift.sender.friendCode} → {gift.recipient.friendCode} ·{" "}
                    {copy.serial} {gift.item.serialNumber} ·{" "}
                    {gift.method === "FRIEND_QR"
                      ? copy.methodQr
                      : copy.methodCode}
                  </p>
                </div>
                <time
                  className="shrink-0 text-xs text-[#6C746A]"
                  dateTime={gift.createdAt.toISOString()}
                >
                  {formatDate(gift.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-[#7A8276]">{copy.historyEmpty}</p>
        )}
        {data.giftCount > data.pageSize ? (
          <nav
            aria-label={copy.giftHistory}
            className="mt-5 flex justify-between border-t border-[#E5E2D3] pt-4"
          >
            {page > 1 ? (
              <Link
                className="text-sm font-bold text-[#156240]"
                href={pageHref(page - 1)}
              >
                {copy.previous}
              </Link>
            ) : (
              <span />
            )}
            {page * data.pageSize < data.giftCount ? (
              <Link
                className="text-sm font-bold text-[#156240]"
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
