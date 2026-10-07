import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Plus, Ticket } from "lucide-react";
import {
  CreateTicketDefinitionForm,
  IssueTicketForm,
  TicketGiftabilityButton,
} from "@/features/inventory/components/AdminTicketForms";
import { getInventoryCopy } from "@/features/inventory/copy";
import { getAdminTicketDefinitions } from "@/features/inventory/services/inventoryService";
import { withLocale } from "@/lib/routes";

type TicketDefinition = Awaited<
  ReturnType<typeof getAdminTicketDefinitions>
>[number];

export async function AdminInventoryPanel({
  locale,
  selectedDefinitionId,
}: {
  locale: string;
  selectedDefinitionId?: string;
}) {
  const definitions = await getAdminTicketDefinitions();
  return (
    <AdminInventoryPanelContent
      definitions={definitions}
      locale={locale}
      selectedDefinitionId={selectedDefinitionId}
    />
  );
}

export function AdminInventoryPanelContent({
  definitions,
  locale,
  selectedDefinitionId,
}: {
  definitions: TicketDefinition[];
  locale: string;
  selectedDefinitionId?: string;
}) {
  const selected =
    definitions.find((definition) => definition.id === selectedDefinitionId) ??
    definitions[0];
  const copy = getInventoryCopy(locale);
  const remaining = selected ? selected.totalSupply - selected.issuedCount : 0;

  return (
    <section aria-label={copy.admin} className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-ink">
        {copy.admin}
      </h2>

      {selected ? (
        <>
          <details className="group" id="create-ticket">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold text-forest transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden">
              <Plus aria-hidden="true" className="h-4 w-4" />
              {copy.adminNewBatch}
            </summary>
            <div className="mt-3 max-w-xl rounded-2xl bg-paper p-5 sm:p-6">
              <CreateTicketDefinitionForm locale={locale} showHeading={false} />
            </div>
          </details>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
            <aside className="space-y-4">
              <h3 className="text-sm font-semibold text-ink">
                {copy.adminBatch}
              </h3>
              <nav
                aria-label={copy.adminBatch}
                className="max-h-80 overflow-y-auto rounded-2xl bg-paper p-1.5"
              >
                {definitions.map((definition) => {
                  const available =
                    definition.totalSupply - definition.issuedCount;
                  const active = definition.id === selected.id;
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
                        active
                          ? "bg-fog text-forest"
                          : "text-ink hover:bg-fog/70"
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
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-ink/70">
                        {available}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <div className="min-w-0 space-y-6">
              <section
                aria-label={selected.title}
                className="rounded-2xl bg-forest p-5 text-paper sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper/10">
                    <Ticket aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-xl font-bold leading-snug">
                      {selected.title}
                    </h3>
                    {selected.description ? (
                      <p className="mt-1 text-sm leading-6 text-paper/85">
                        {selected.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-paper/20 pt-5">
                  <div>
                    <p className="text-sm text-paper/80">{copy.remaining}</p>
                    <p className="mt-0.5 text-3xl font-bold tabular-nums">
                      {remaining}
                    </p>
                  </div>
                  <p className="pb-1 text-sm text-paper/85">
                    {copy.allocated} {selected.issuedCount}
                    <span aria-hidden="true" className="mx-2">
                      ·
                    </span>
                    {copy.supply} {selected.totalSupply}
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-paper/20 pt-4">
                  {remaining > 0 ? (
                    <a
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-paper px-4 text-sm font-bold text-forest transition hover:bg-paper/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                      href="#issue-ticket"
                    >
                      {copy.issue}
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </a>
                  ) : null}
                  <TicketGiftabilityButton
                    definitionId={selected.id}
                    isGiftable={selected.isGiftable}
                    locale={locale}
                    tone="dark"
                  />
                  <Link
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-paper transition hover:bg-paper/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                    href={withLocale(
                      locale,
                      `/admin/items/tickets/${selected.id}`,
                    )}
                  >
                    {copy.viewHistory}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </section>

              <section
                className="scroll-mt-6 rounded-2xl bg-paper p-5 sm:p-6"
                id="issue-ticket"
              >
                <h3 className="text-lg font-bold text-ink">{copy.issue}</h3>
                {remaining > 0 ? (
                  <p className="mb-5 mt-1 text-sm leading-6 text-ink/70">
                    {copy.adminIssueHint}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-ink/70">
                    {copy.adminSoldOut}
                  </p>
                )}
                <IssueTicketForm
                  definitionId={selected.id}
                  initialRequestId={randomUUID()}
                  key={selected.id}
                  locale={locale}
                  remaining={remaining}
                />
              </section>
            </div>
          </div>
        </>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-8">
          <div className="rounded-2xl bg-forest p-5 text-paper sm:p-6">
            <Ticket aria-hidden="true" className="h-7 w-7" />
            <h3 className="mt-5 text-xl font-bold">{copy.adminEmptyTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-paper/85">
              {copy.adminIntro}
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-5 sm:p-6">
            <CreateTicketDefinitionForm locale={locale} showHeading={false} />
          </div>
        </div>
      )}
    </section>
  );
}
