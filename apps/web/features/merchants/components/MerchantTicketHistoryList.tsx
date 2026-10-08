import Link from "next/link";
import { getMerchantTicketCopy } from "@/features/merchants/merchantTicketCopy";
import { withLocale } from "@/lib/routes";

export type MerchantTicketHistory = {
  total: number;
  page: number;
  pageSize: number;
  records: Array<{
    id: string;
    redeemedAt: string;
    method: string;
    holder: { nickname: string };
    redeemer: { nickname: string };
  }>;
};

export function MerchantTicketHistoryList({
  definitionId,
  history,
  historyBasePath,
  locale,
}: {
  definitionId: string;
  history: MerchantTicketHistory;
  historyBasePath?: string;
  locale: string;
}) {
  const copy = getMerchantTicketCopy(locale);
  const totalPages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const pageHref = (number: number) =>
    withLocale(
      locale,
      `${historyBasePath ?? `/profile/store/tickets/${encodeURIComponent(definitionId)}/history`}?page=${number}`,
    );

  return (
    <section className="mt-8" aria-label={copy.history}>
      <p className="text-sm tabular-nums text-ink/65">
        {copy.historyCount(history.total)}
      </p>
      {history.records.length ? (
        <ol className="mt-4 space-y-2">
          {history.records.map((record) => (
            <li
              className="rounded-2xl bg-fog/60 px-4 py-4 sm:px-5"
              key={record.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold leading-6">
                    {copy.redeemFor(record.holder.nickname)}
                  </p>
                  <p className="mt-0.5 text-sm text-ink/70">
                    {copy.redeemedBy(record.redeemer.nickname)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-forest">
                  {record.method === "QR"
                    ? copy.methodQr
                    : record.method === "MANUAL"
                      ? copy.methodCode
                      : copy.methodUnknown}
                </span>
              </div>
              <time
                className="mt-3 block text-xs tabular-nums text-ink/65"
                dateTime={new Date(record.redeemedAt).toISOString()}
              >
                {dateFormatter.format(new Date(record.redeemedAt))}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-2xl bg-fog/70 px-5 py-8 text-center text-sm text-ink/70">
          {copy.historyEmpty}
        </p>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label={copy.history}
          className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
        >
          {history.page > 1 ? (
            <Link
              className="inline-flex min-h-11 items-center text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={pageHref(history.page - 1)}
            >
              {copy.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs tabular-nums text-ink/70">
            {copy.page(history.page, totalPages)}
          </span>
          {history.page < totalPages ? (
            <Link
              className="inline-flex min-h-11 items-center justify-self-end text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={pageHref(history.page + 1)}
            >
              {copy.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
