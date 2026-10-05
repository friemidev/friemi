import { notFound, redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";
import { isNowPreviewEnabled } from "@/features/now/previewAccess";

export default async function NowPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!isNowPreviewEnabled()) notFound();
  const { locale } = await params;
  redirect(withLocale(locale, "/mobile-home?previewNow=1"));
}
