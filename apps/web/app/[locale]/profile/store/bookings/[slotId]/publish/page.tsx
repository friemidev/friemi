import { redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

export default async function LegacyBookingPublishPage({
  params,
}: {
  params: Promise<{ locale: string; slotId: string }>;
}) {
  const { locale, slotId } = await params;
  redirect(withLocale(locale, `/profile/store/bookings/${slotId}`));
}
