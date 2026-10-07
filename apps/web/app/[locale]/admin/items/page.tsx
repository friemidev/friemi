import { redirect } from "next/navigation";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminItemsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/items");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  redirect(withLocale(locale, "/admin/merchants?view=items"));
}
