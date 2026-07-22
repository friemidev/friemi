import Link from "next/link";
import { headers } from "next/headers";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClerkAuthMountGuard } from "@/features/auth/components/ClerkAuthMountGuard";
import { WechatWebViewGuide } from "@/features/auth/components/WechatWebViewGuide";
import {
  authRedirectParamName,
  getAuthRedirectFallback,
  getNativeAuthCompleteHref,
  getSignUpHref,
  normalizeAuthRedirectTarget,
} from "@/lib/auth-redirect";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    [authRedirectParamName]?: string | string[];
  }>;
};

function isWechatWebView(userAgent: string | null) {
  return /MicroMessenger/i.test(userAgent ?? "");
}

function isFriemiAndroidApp(userAgent: string | null) {
  return /FriemiAndroid\//i.test(userAgent ?? "");
}

function isFriemiIOSApp(userAgent: string | null) {
  return /FriemiIOS\//i.test(userAgent ?? "");
}

function getPrivacyLabel(locale: string) {
  if (locale === "en") return "Privacy Policy";
  if (locale === "fr") return "Politique de confidentialite";
  return "隐私政策";
}

function getSafetyLabel(locale: string) {
  if (locale === "en") return "Community Safety";
  if (locale === "fr") return "Securite communautaire";
  return "社区安全";
}

export default async function SignInPage({
  params,
  searchParams,
}: SignInPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const redirectTarget = normalizeAuthRedirectTarget(
    locale,
    query?.[authRedirectParamName],
  );
  const fallbackRedirectUrl = getAuthRedirectFallback(locale);
  const t = getCopy(locale);
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const forceRedirectUrl =
    isFriemiAndroidApp(userAgent) || isFriemiIOSApp(userAgent)
      ? getNativeAuthCompleteHref(locale, redirectTarget)
      : redirectTarget;

  if (isWechatWebView(userAgent)) {
    return (
      <PageContainer className="flex min-h-[calc(100svh-8rem)] items-start justify-center py-4">
        <WechatWebViewGuide locale={locale} />
      </PageContainer>
    );
  }

  if (!hasClerkKeys()) {
    return (
      <PageContainer className="auth-page-shell relative isolate flex min-h-svh max-w-none flex-col items-center justify-center overflow-hidden px-5 py-8">
        <AuthBackdrop />
        <div className="max-w-md rounded-[1.4rem] bg-[#FEFFF9]/86 p-6 text-center shadow-[0_24px_70px_rgba(21,98,64,0.12)]">
          <h1 className="text-xl font-semibold text-ink">
            {t.auth.clerkMissingTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {t.auth.signInMissingDescription}
          </p>
        </div>
        <PrivacyLink locale={locale} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="auth-page-shell relative isolate flex min-h-svh max-w-none flex-col overflow-hidden px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1.2rem+env(safe-area-inset-top))] sm:px-6">
      <AuthBackdrop />

      <section className="relative mx-auto flex min-h-[calc(100svh-2.2rem)] w-full max-w-[24rem] flex-col justify-center">
        <header className="mb-8 flex justify-center">
          <Link
            aria-label="Friemi"
            className="inline-flex"
            href={withLocale(locale, "/mobile-home")}
            prefetch={false}
          >
            <BrandLockup className="h-10 w-[8.4rem]" priority size="md" />
          </Link>
        </header>

        <ClerkAuthMountGuard
          fallbackRedirectUrl={fallbackRedirectUrl}
          forceRedirectUrl={forceRedirectUrl}
          locale={locale}
          mode="sign-in"
          path={`/${locale}/sign-in`}
          secondaryUrl={getSignUpHref(locale, redirectTarget)}
        />

        <footer className="mt-7">
          <PrivacyLink locale={locale} />
        </footer>
      </section>
    </PageContainer>
  );
}

function AuthBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#FEFFF9_0%,#F1F2EC_72%,#FFF5E6_100%)]" />
      <div className="absolute -left-20 top-12 h-64 w-64 rounded-full bg-[#8AB68E]/20 blur-3xl" />
      <div className="absolute right-[-8rem] bottom-8 h-72 w-72 rounded-full bg-[#DEEBFF]/58 blur-3xl" />
    </div>
  );
}

function PrivacyLink({ locale }: { locale: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-bold text-[#8E8383]/78">
      <Link
        className="transition hover:text-[#156240]"
        href={withLocale(locale, "/privacy")}
      >
        {getPrivacyLabel(locale)}
      </Link>
      <Link
        className="transition hover:text-[#156240]"
        href={withLocale(locale, "/safety")}
      >
        {getSafetyLabel(locale)}
      </Link>
    </div>
  );
}
