import Link from "next/link";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClerkAuthMountGuard } from "@/features/auth/components/ClerkAuthMountGuard";
import { WechatWebViewGuide } from "@/features/auth/components/WechatWebViewGuide";
import {
  authRedirectParamName,
  getAndroidAuthCompleteHref,
  getAuthRedirectFallback,
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

function getPrivacyLabel(locale: string) {
  if (locale === "en") return "Privacy Policy";
  if (locale === "fr") return "Politique de confidentialite";
  return "隐私政策";
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
  const forceRedirectUrl = isFriemiAndroidApp(userAgent)
    ? getAndroidAuthCompleteHref(locale, redirectTarget)
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
      <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center gap-5">
        <div className="max-w-md rounded-lg border border-black/10 bg-white/80 p-6 text-center">
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
    <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center gap-5">
      <ClerkAuthMountGuard
        fallbackRedirectUrl={fallbackRedirectUrl}
        forceRedirectUrl={forceRedirectUrl}
        locale={locale}
        mode="sign-in"
        path={`/${locale}/sign-in`}
        secondaryUrl={getSignUpHref(locale, redirectTarget)}
      />
      <PrivacyLink locale={locale} />
    </PageContainer>
  );
}

function PrivacyLink({ locale }: { locale: string }) {
  return (
    <Link
      className="text-sm font-medium text-zinc-500 underline underline-offset-4 transition hover:text-[#156240]"
      href={withLocale(locale, "/privacy")}
    >
      {getPrivacyLabel(locale)}
    </Link>
  );
}
