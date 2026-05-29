import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Globe2, Mail, MapPin, Store } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getMerchantProfile } from "@/features/merchants/queries/getMerchantProfile";
import { getCopy } from "@/lib/copy";

type MerchantPageProps = {
  params: Promise<{
    locale: string;
    merchantId: string;
  }>;
};

export const dynamic = "force-dynamic";

function getMerchantInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export default async function MerchantPage({ params }: MerchantPageProps) {
  const { locale, merchantId } = await params;
  const t = getCopy(locale);
  const merchant = await getMerchantProfile(merchantId);

  if (!merchant) {
    notFound();
  }

  return (
    <PageContainer className="space-y-7 pb-10">
      <section className="grid gap-5 rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-6 lg:grid-cols-[1fr_320px] lg:items-end">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper text-2xl font-semibold text-ink ring-1 ring-black/10">
            {merchant.logoUrl?.startsWith("/") ? (
              <Image
                src={merchant.logoUrl}
                alt={merchant.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              getMerchantInitial(merchant.name)
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-black/10">
              <Store className="h-4 w-4 text-moss" />
              {t.merchant.profileEyebrow}
            </div>
            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-normal text-ink sm:text-4xl">
                {merchant.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
                {merchant.description}
              </p>
            </div>
          </div>
        </div>

        <aside className="grid gap-3 rounded-md bg-paper/80 p-4 text-sm text-zinc-700">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-white/80 p-3">
              <p className="text-xs text-zinc-500">
                {t.merchant.activitiesTitle}
              </p>
              <p className="mt-1 font-semibold text-ink">
                {t.merchant.totalActivities(merchant.totalActivityCount)}
              </p>
            </div>
            <div className="rounded-md bg-white/80 p-3">
              <p className="text-xs text-zinc-500">
                {t.activityLabels.statuses.RECRUITING}
              </p>
              <p className="mt-1 font-semibold text-ink">
                {t.merchant.upcomingActivities(merchant.upcomingActivityCount)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {merchant.address
                  ? `${merchant.city} · ${merchant.address}`
                  : merchant.city}
              </span>
            </p>
            {merchant.latitude !== null && merchant.longitude !== null ? (
              <p className="flex items-start gap-2 text-xs text-zinc-500">
                <span className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  {t.merchant.coordinates} ·{" "}
                  {formatCoordinates(merchant.latitude, merchant.longitude)}
                </span>
              </p>
            ) : null}
            {merchant.websiteUrl ? (
              <Link
                className="flex items-center gap-2 font-medium text-moss hover:text-ink"
                href={merchant.websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Globe2 className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{t.merchant.website}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </Link>
            ) : null}
            {merchant.contactEmail ? (
              <Link
                className="flex items-center gap-2 font-medium text-moss hover:text-ink"
                href={`mailto:${merchant.contactEmail}`}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{t.merchant.contact}</span>
              </Link>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-ink">
            {t.merchant.activitiesTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
            {t.merchant.activitiesDescription(merchant.name)}
          </p>
        </div>

        {merchant.activities.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {merchant.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.merchant.emptyTitle}
            description={t.merchant.emptyDescription}
          />
        )}
      </section>
    </PageContainer>
  );
}
