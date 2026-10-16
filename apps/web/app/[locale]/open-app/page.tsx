import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHandoff } from "@/features/mobile/components/AppHandoff";
import { normalizeAppLinkTarget } from "@/features/mobile/appLinks";
import { APP_HANDOFF_ENABLED } from "@/features/mobile/appHandoffRollout";

export const metadata = {
  title: "Friemi",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function OpenAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ target?: string; retry?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const target = normalizeAppLinkTarget(query.target, locale);
  if (!APP_HANDOFF_ENABLED) redirect(target);
  const userAgent = (await headers()).get("user-agent") ?? "";
  return (
    <main className="auth-page-shell min-h-svh bg-white px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <AppHandoff
        locale={locale}
        target={target}
        userAgent={userAgent}
        retry={query.retry === "1"}
      />
    </main>
  );
}
