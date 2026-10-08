import { redirect } from "next/navigation";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminDataScraperPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminDataScraperPage({
  params,
}: AdminDataScraperPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/data-scraper");
  redirect(withLocale(locale, "/admin/merchants"));
}
