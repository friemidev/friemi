import { redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  redirect(withLocale(locale, "/admin/data-scraper"));
}


