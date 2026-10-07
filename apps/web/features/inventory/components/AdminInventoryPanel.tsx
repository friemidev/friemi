import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowUpRight, Ticket } from "lucide-react";
import {
  CreateTicketDefinitionForm,
  IssueTicketForm,
  TicketGiftabilityButton,
} from "@/features/inventory/components/AdminTicketForms";
import { getInventoryCopy } from "@/features/inventory/copy";
import { getAdminTicketDefinitions } from "@/features/inventory/services/inventoryService";
import { withLocale } from "@/lib/routes";

export async function AdminInventoryPanel({
  locale,
  selectedDefinitionId,
}: {
  locale: string;
  selectedDefinitionId?: string;
}) {
  const definitions = await getAdminTicketDefinitions();
  const selected =
    definitions.find((definition) => definition.id === selectedDefinitionId) ??
    definitions[0];
  const copy = getInventoryCopy(locale);

  return (
    <section aria-label={copy.admin} className="space-y-6">
      {selected ? (
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#1D3024]">
          <Ticket aria-hidden="true" className="h-5 w-5 text-[#176B49]" />
          {copy.admin}
        </h2>
      ) : null}

      {selected ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
          <nav aria-label={copy.admin} className="max-h-[26rem] space-y-1 overflow-auto">
            {definitions.map((definition) => {
              const remaining = definition.totalSupply - definition.issuedCount;
              const active = definition.id === selected.id;
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49] ${
                    active
                      ? "bg-[#E8F3E9] text-[#174D33]"
                      : "text-[#35483A] hover:bg-[#F2F6F0]"
                  }`}
                  href={withLocale(
                    locale,
                    `/admin/merchants?view=items&ticket=${encodeURIComponent(definition.id)}`,
                  )}
                  key={definition.id}
                >
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {definition.title}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${active ? "text-[#176B49]" : "text-[#718073]"}`}
                  >
                    {remaining}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="min-w-0 rounded-2xl bg-white px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#1D3024]">
                  {selected.title}
                </h3>
                <p className="mt-1 text-sm text-[#617063]">
                  {copy.remaining} {selected.totalSupply - selected.issuedCount}
                  <span aria-hidden="true"> / </span>
                  {copy.supply} {selected.totalSupply}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <TicketGiftabilityButton
                  definitionId={selected.id}
                  isGiftable={selected.isGiftable}
                  locale={locale}
                />
                <Link
                  className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#176B49] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
                  href={withLocale(
                    locale,
                    `/admin/items/tickets/${selected.id}`,
                  )}
                >
                  {copy.viewHistory}
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <IssueTicketForm
              definitionId={selected.id}
              initialRequestId={randomUUID()}
              locale={locale}
              remaining={selected.totalSupply - selected.issuedCount}
            />
          </div>
        </div>
      ) : null}

      {definitions.length === 0 ? (
        <div className="max-w-xl [&>section]:!rounded-none [&>section]:!bg-transparent [&>section]:!p-0 [&>section]:!ring-0">
          <h2 className="text-xl font-bold text-[#1D3024]">{copy.create}</h2>
          <p className="mb-5 mt-1 text-sm text-[#617063]">{copy.adminIntro}</p>
          <CreateTicketDefinitionForm locale={locale} showHeading={false} />
        </div>
      ) : (
        <details className="border-t border-[#DFE8DA] pt-5" id="create-ticket">
          <summary className="cursor-pointer text-sm font-semibold text-[#176B49] marker:text-[#176B49]">
            {copy.create}
          </summary>
          <div className="mt-4 max-w-xl [&>section]:!rounded-none [&>section]:!bg-transparent [&>section]:!p-0 [&>section]:!ring-0">
            <CreateTicketDefinitionForm locale={locale} showHeading={false} />
          </div>
        </details>
      )}
    </section>
  );
}
