import { notFound, redirect } from "next/navigation";
import { AdminItemPageFrame } from "@/features/inventory/components/AdminItemPageFrame";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import {
  AdminTicketRevokeButton,
  AdminTicketRoleForm,
} from "@/features/inventory/components/AdminTicketRoleControls";
import { getAdminTicketAccessCopy } from "@/features/inventory/adminTicketAccessCopy";
import { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { getTicketAccessDetail } from "@/features/inventory/services/ticketAccessService";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminTicketStaffPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}/access/staff`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${definitionId}/access/staff`,
  );
  if (actor.status !== "ACTIVE") redirect(withLocale(locale, "/"));
  const [definition, detail] = await Promise.all([
    getAdminInventoryDefinition(definitionId),
    getTicketAccessDetail({ actorProfileId: actor.id, definitionId, isAdmin: true }),
  ]);
  if (!definition || definition.kind !== "EVENT_TICKET" || !detail) notFound();
  const copy = getAdminTicketAccessCopy(locale);
  const staff = detail.staff.filter((access) => access.role === "REDEEMER");
  const current = staff.filter((access) => access.status !== "REVOKED");
  const past = staff.filter((access) => access.status === "REVOKED");

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}/access`}
      backLabel={getAdminItemCopy(locale).access.pageTitle}
      compact
      definition={definition}
      locale={locale}
      pageTitle={copy.staffTitle}
    >
      <section className="space-y-5 rounded-2xl bg-paper p-5 sm:p-6">
        <p className="text-sm leading-6 text-ink/70">{copy.staffHelp}</p>
        <AdminTicketRoleForm definitionId={definitionId} locale={locale} role="REDEEMER" />
      </section>
      <section className="rounded-2xl bg-paper px-5 py-5 sm:px-6">
        <h2 className="text-base font-bold text-ink">{copy.active}</h2>
        {current.length ? (
          <ul className="mt-3 divide-y divide-sand/60">
            {current.map((access) => (
              <li className="flex items-center gap-3 py-3" key={access.id}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{access.profile.nickname}</p>
                  <p className="mt-0.5 text-xs text-ink/60">
                    {access.profile.friendCode}
                    <span aria-hidden="true" className="mx-2">·</span>
                    {access.status === "PENDING" ? copy.pending : copy.active}
                  </p>
                </div>
                <AdminTicketRevokeButton
                  accessId={access.id}
                  definitionId={definitionId}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink/65">{copy.emptyStaff}</p>
        )}
      </section>
      {past.length ? (
        <section className="rounded-2xl bg-paper px-5 py-5 sm:px-6">
          <h2 className="text-base font-bold text-ink">{copy.revoked}</h2>
          <ul className="mt-3 divide-y divide-sand/60">
            {past.map((access) => (
              <li className="py-3 text-sm text-ink/65" key={access.id}>
                {access.profile.nickname}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminItemPageFrame>
  );
}
