import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { getMerchantBookingAdminCopy } from "@/components/admin/merchantBookingCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function BookingPermissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants/bookings");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 120) : "";
  const page = Math.min(
    10000,
    Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1),
  );
  const where = q
    ? { name: { contains: q, mode: "insensitive" as const } }
    : {};
  const [merchants, total, legacyCount] = await Promise.all([
    prisma.merchant.findMany({
      where,
      take: 25,
      skip: (page - 1) * 25,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        bookingAccessEnabled: true,
        bookingSettings: { select: { enabled: true } },
      },
    }),
    prisma.merchant.count({ where }),
    prisma.merchantResidencySlot.count(),
  ]);
  const copy = getMerchantBookingAdminCopy(locale);
  const pageHref = (nextPage: number) =>
    withLocale(
      locale,
      `/admin/merchants/bookings?${new URLSearchParams({ q, page: String(nextPage) })}`,
    );
  return (
    <PageContainer
      mobileSafeTop
      className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] max-w-3xl pb-16 max-md:px-4 max-md:py-0 md:py-10"
    >
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel={copy.back}
        title={copy.title}
      />
      <form className="mt-7 flex gap-2" role="search">
        <label htmlFor="booking-store-search" className="sr-only">
          {copy.search}
        </label>
        <input
          id="booking-store-search"
          name="q"
          defaultValue={q}
          placeholder={copy.search}
          className="min-h-12 min-w-0 flex-1 rounded-xl bg-fog px-4 text-base focus-visible:outline-2 focus-visible:outline-forest"
        />
        <button
          type="submit"
          className="min-h-12 rounded-xl bg-forest px-4 text-sm font-bold text-white"
        >
          {copy.submitSearch}
        </button>
      </form>
      <ol className="mt-5">
        {merchants.map((merchant) => (
          <li key={merchant.id}>
            <Link
              className="flex min-h-24 items-center gap-4 py-5 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-forest"
              href={withLocale(
                locale,
                `/admin/merchants/${merchant.id}/bookings`,
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">
                  {merchant.name}
                </span>
                <span className="mt-1 block text-sm text-ink/70">
                  {merchant.city} ·{" "}
                  {merchant.bookingAccessEnabled
                    ? merchant.bookingSettings
                      ? merchant.bookingSettings.enabled
                        ? copy.enabled
                        : copy.paused
                      : copy.unconfigured
                    : copy.denied}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-forest"
              />
            </Link>
          </li>
        ))}
      </ol>
      {!merchants.length ? (
        <p className="py-12 text-center text-sm text-ink/70">{copy.empty}</p>
      ) : null}
      <nav
        className="mt-5 flex items-center justify-between gap-4"
        aria-label={
          locale === "fr"
            ? "Pagination"
            : locale === "en"
              ? "Pagination"
              : "分页"
        }
      >
        {page > 1 ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-bold text-forest"
            href={pageHref(page - 1)}
          >
            {copy.previous}
          </Link>
        ) : (
          <span />
        )}
        {page * 25 < total ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-bold text-forest"
            href={pageHref(page + 1)}
          >
            {copy.next}
          </Link>
        ) : null}
      </nav>
      {legacyCount > 0 ? (
        <Link
          className="mt-8 inline-flex min-h-11 items-center text-sm text-ink/70 underline underline-offset-4"
          href={withLocale(locale, "/admin/merchants/bookings/legacy")}
        >
          {copy.legacy}
        </Link>
      ) : null}
    </PageContainer>
  );
}
