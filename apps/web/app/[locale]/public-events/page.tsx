import { redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

type PublicEventsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function PublicEventsPage({
  params,
}: PublicEventsPageProps) {
  const { locale } = await params;

  redirect(withLocale(locale, "/activities"));
}
