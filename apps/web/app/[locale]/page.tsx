import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { buildPageShareMetadata, getRequestBaseUrl } from "@/lib/share-metadata";

type RootPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: RootPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getCopy(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: `${t.home.tagline} · ${t.home.description}`,
    path: withLocale(locale, "/home"),
    title: `${t.home.title} · ${t.home.tagline}`,
  });
}

export default async function RootPage({ params }: RootPageProps) {
  const { locale } = await params;

  redirect(withLocale(locale, "/home"));
}
