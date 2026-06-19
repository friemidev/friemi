import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  generalPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type PublicEventsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublicEventsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getCopy(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: generalPageShareDescription,
    path: withLocale(locale, "/activities"),
    title: `${t.activities.title} · Next Fun`,
  });
}

export default async function PublicEventsPage({
  params,
}: PublicEventsPageProps) {
  const { locale } = await params;

  redirect(withLocale(locale, "/activities"));
}
