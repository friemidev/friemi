import { redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

type RootPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function RootPage({ params }: RootPageProps) {
  const { locale } = await params;

  redirect(withLocale(locale, "/lobby"));
}
