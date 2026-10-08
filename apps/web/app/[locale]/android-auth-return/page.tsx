import { AndroidAuthHandoffReturn } from "@/features/auth/components/AndroidAuthHandoffReturn";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function AndroidAuthReturnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AndroidAuthHandoffReturn locale={locale} />;
}
