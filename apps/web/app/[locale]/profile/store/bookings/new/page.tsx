import { notFound } from "next/navigation";
import { OwnerResidencyNew } from "@/features/merchants/residency/components/OwnerResidencyPages";
import { getOwnerResidencySlots } from "@/features/merchants/residency/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function NewOwnerResidencyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/bookings/new",
  );
  const overview = await getOwnerResidencySlots(profile.id);
  if (!overview.merchant) notFound();
  const { date } = await searchParams;
  const initialDate = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(
    date ?? "",
  )
    ? date
    : undefined;
  return <OwnerResidencyNew initialDate={initialDate} locale={locale} />;
}
