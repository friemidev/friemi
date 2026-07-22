import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClerkAuthMountGuard } from "@/features/auth/components/ClerkAuthMountGuard";
import { WechatWebViewGuide } from "@/features/auth/components/WechatWebViewGuide";
import {
  authRedirectParamName,
  getAuthRedirectFallback,
  getNativeAuthCompleteHref,
  getSignInHref,
  normalizeAuthRedirectTarget,
} from "@/lib/auth-redirect";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
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

export default async function SignUpPage({
  params,
  searchParams,
}: SignUpPageProps) {
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
      <PageContainer className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-black/10 bg-white/80 p-6 text-center">
          <h1 className="text-xl font-semibold text-ink">
            {t.auth.clerkMissingTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {t.auth.signUpMissingDescription}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center">
      <ClerkAuthMountGuard
        fallbackRedirectUrl={fallbackRedirectUrl}
        forceRedirectUrl={forceRedirectUrl}
        locale={locale}
        mode="sign-up"
        path={`/${locale}/sign-up`}
        secondaryUrl={getSignInHref(locale, redirectTarget)}
      />
    </PageContainer>
  );
}
