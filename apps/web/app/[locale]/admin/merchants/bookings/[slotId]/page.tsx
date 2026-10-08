import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getAdminResidencyCopy } from "@/features/merchants/residency/adminCopy";
import {
  AdminResidencyCancelForm,
  AdminResidencyReviewForm,
} from "@/features/merchants/residency/components/AdminResidencyReviewForm";
import { formatResidencyDate } from "@/features/merchants/residency/components/ResidencyCalendar";
import { getAdminResidencySlot } from "@/features/merchants/residency/queries";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminResidencyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slotId: string }>;
}) {
  const { locale, slotId } = await params;
  await requireAdminPageAccess(locale, `/admin/merchants/bookings/${slotId}`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const slot = await getAdminResidencySlot(slotId);
  if (!slot) notFound();
  const copy = getAdminResidencyCopy(locale);

  return (
    <PageContainer
      mobileSafeTop
      className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] max-w-2xl pb-16 max-md:px-4 max-md:py-0 md:py-10"
    >
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants/bookings")}
        backLabel={copy.backList}
        title={copy.title}
      />
      <article className="pt-8">
        <span className="inline-flex rounded-full bg-fog px-3 py-1.5 text-xs font-bold text-forest">
          {copy.status[slot.status]}
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{slot.title}</h2>
        <p className="mt-2 text-sm font-semibold text-ink/70">
          {slot.merchant.name} · {slot.merchant.city}
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-forest">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {formatResidencyDate(slot.date, locale)}
        </p>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-ink/75">
          {slot.description}
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest underline-offset-4 hover:underline"
          href={withLocale(locale, `/merchants/${slot.merchant.id}`)}
        >
          {copy.publicPage}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        {slot.rejectionReason ? (
          <p className="mt-4 rounded-2xl bg-fog px-5 py-4 text-sm leading-6 text-ink/75">
            {slot.rejectionReason}
          </p>
        ) : null}
        {slot.status === "CONFIRMED" || slot.status === "PUBLISHED" ? (
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-forest">
            <Users aria-hidden="true" className="h-4 w-4" />
            {copy.signups(slot.signupCount)}
          </p>
        ) : null}
        {slot.activityId ? (
          <Link
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest underline-offset-4 hover:underline"
            href={getLocalizedActivityDetailPath(locale, slot.activityId)}
          >
            {copy.activity}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </article>
      {slot.status === "PENDING" ? (
        <AdminResidencyReviewForm locale={locale} slotId={slot.id} />
      ) : null}
      {slot.status === "PENDING" || slot.status === "CONFIRMED" ? (
        <AdminResidencyCancelForm
          locale={locale}
          pendingRequest={slot.status === "PENDING"}
          slotId={slot.id}
        />
      ) : null}
    </PageContainer>
  );
}
