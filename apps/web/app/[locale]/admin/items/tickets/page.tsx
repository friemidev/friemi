import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Ticket } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  CreateTicketDefinitionForm,
  IssueTicketForm,
  TicketGiftabilityButton,
} from "@/features/inventory/components/AdminTicketForms";
import { getInventoryCopy } from "@/features/inventory/copy";
import { getAdminTicketDefinitions } from "@/features/inventory/services/inventoryService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminTicketInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/items/tickets");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const definitions = await getAdminTicketDefinitions();
  const copy = getInventoryCopy(locale);

  return (
    <PageContainer className="max-w-3xl space-y-6 pb-28 pt-5 md:pb-12 md:pt-10">
      <header>
        <p className="text-xs font-bold tracking-[0.12em] text-[#156240]">
          FRIEMI ADMIN
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#111210]">
          {copy.admin}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6C746A]">
          {copy.adminIntro}
        </p>
      </header>
      <CreateTicketDefinitionForm locale={locale} />
      <section className="space-y-4">
        {definitions.map((definition) => {
          const remaining = definition.totalSupply - definition.issuedCount;
          return (
            <article
              className="rounded-[1.3rem] bg-white p-5 ring-1 ring-[#D6D5B2] sm:p-6"
              key={definition.id}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF5E8] text-[#156240]">
                  <Ticket className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-[#111210]">
                    {definition.title}
                  </h2>
                  {definition.description ? (
                    <p className="mt-1 text-sm text-[#6C746A]">
                      {definition.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-semibold text-[#156240]">
                    {copy.giftable}: {definition.isGiftable ? "✓" : "—"}
                  </p>
                  <TicketGiftabilityButton
                    definitionId={definition.id}
                    isGiftable={definition.isGiftable}
                    locale={locale}
                  />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-[#F3F5EF] p-4 text-center">
                <div>
                  <p className="text-xs text-[#6C746A]">{copy.supply}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-[#111210]">
                    {definition.totalSupply}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6C746A]">{copy.allocated}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-[#111210]">
                    {definition.issuedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6C746A]">{copy.remaining}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-[#156240]">
                    {remaining}
                  </p>
                </div>
              </div>
              <IssueTicketForm
                definitionId={definition.id}
                initialRequestId={randomUUID()}
                locale={locale}
                remaining={remaining}
              />
              <Link
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#156240]"
                href={withLocale(
                  locale,
                  `/admin/items/tickets/${definition.id}`,
                )}
              >
                {copy.viewHistory} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </section>
    </PageContainer>
  );
}
