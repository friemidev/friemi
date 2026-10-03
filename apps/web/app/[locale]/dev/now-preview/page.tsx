import { notFound, redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

export default async function NowPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  redirect(withLocale(locale, "/mobile-home?previewNow=1"));
}
