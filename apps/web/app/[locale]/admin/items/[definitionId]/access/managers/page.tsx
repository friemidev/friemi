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
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminTicketManagersPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  await requireAdminPageAccess(locale, `/admin/items/${definitionId}/access/managers`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${definitionId}/access/managers`,
  );
  if (actor.status !== "ACTIVE") redirect(withLocale(locale, "/"));
  const [definition, detail] = await Promise.all([
    getAdminInventoryDefinition(definitionId),
    getTicketAccessDetail({ actorProfileId: actor.id, definitionId, isAdmin: true }),
  ]);
  if (!definition || definition.kind !== "EVENT_TICKET" || !detail) notFound();
  const owner = definition.merchantId
    ? await prisma.merchant.findUnique({
        where: { id: definition.merchantId },
        select: {
          owner: { select: { nickname: true, friendCode: true } },
        },
      })
    : null;
  const copy = getAdminTicketAccessCopy(locale);
  const managers = detail.staff.filter((access) => access.role === "MANAGER");
  const current = managers.filter((access) => access.status === "ACTIVE");
  const past = managers.filter((access) => access.status === "REVOKED");

  return (
    <AdminItemPageFrame
      backHref={`/admin/items/${definitionId}/access`}
      backLabel={getAdminItemCopy(locale).access.pageTitle}
      compact
      definition={definition}
      locale={locale}
      pageTitle={copy.managersTitle}
    >
      <section className="space-y-5 rounded-2xl bg-paper p-5 sm:p-6">
        <p className="text-sm leading-6 text-ink/70">{copy.managersHelp}</p>
        {definition.merchant ? (
          <div className="rounded-xl bg-fog p-4">
            <p className="text-xs font-bold text-forest">{copy.merchantOwner}</p>
            <p className="mt-1 font-semibold text-ink">
              {owner?.owner?.nickname ?? definition.merchant.name}
              {owner?.owner?.friendCode ? (
                <span className="ml-2 font-mono text-xs font-medium text-ink/60">
                  {owner.owner.friendCode}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink/60">{copy.merchantOwnerHint}</p>
          </div>
        ) : null}
        <AdminTicketRoleForm definitionId={definitionId} locale={locale} role="MANAGER" />
      </section>
      <section className="rounded-2xl bg-paper px-5 py-5 sm:px-6">
        <h2 className="text-base font-bold text-ink">{copy.active}</h2>
        {current.length ? (
          <ul className="mt-3 divide-y divide-sand/60">
            {current.map((access) => (
              <li className="flex items-center gap-3 py-3" key={access.id}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{access.profile.nickname}</p>
                  <p className="font-mono text-xs text-ink/60">{access.profile.friendCode}</p>
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
          <p className="mt-3 text-sm text-ink/65">{copy.emptyManagers}</p>
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
