import { notFound } from "next/navigation";
import {
  TicketWorkbenchArtwork,
  TicketWorkbenchLayout,
} from "@/features/inventory/components/TicketWorkbenchLayout";
import { getTicketAccessDetail } from "@/features/inventory/services/ticketAccessService";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";
import { MerchantTicketStaff } from "@/features/merchants/components/MerchantTicketStaff";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketWorkbenchStaffPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/ticket-workbench/${definitionId}/staff`,
  );
  const detail = await getTicketAccessDetail({
    actorProfileId: profile.id,
    definitionId,
    isAdmin: await isCurrentUserAdmin(),
  });
  if (!detail) notFound();
  const copy = getTicketWorkbenchCopy(locale);

  return (
    <TicketWorkbenchLayout
      backPath={`/profile/ticket-workbench/${encodeURIComponent(definitionId)}`}
      locale={locale}
      title={copy.staff}
    >
      <div className="max-w-2xl">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-fog/70 p-3">
          <TicketWorkbenchArtwork
            className="h-16 w-16 rounded-xl"
            imageUrl={detail.definition.imageUrl}
            locale={locale}
            title={detail.definition.title}
          />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-bold text-ink">
              {detail.definition.title}
            </p>
            {detail.definition.merchant?.name ? (
              <p className="mt-1 truncate text-xs text-ink/70">
                {detail.definition.merchant.name}
              </p>
            ) : null}
          </div>
        </div>
        <MerchantTicketStaff
          definitionId={definitionId}
          locale={locale}
          staff={detail.staff}
        />
      </div>
    </TicketWorkbenchLayout>
  );
}
