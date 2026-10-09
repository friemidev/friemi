import { redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

export default async function NewOwnerBookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(withLocale(locale, "/profile/store/bookings/settings"));
}
