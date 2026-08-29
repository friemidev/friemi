import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClerkAuthMountGuard } from "@/features/auth/components/ClerkAuthMountGuard";
import { WechatWebViewGuide } from "@/features/auth/components/WechatWebViewGuide";
import {
  authRedirectParamName,
  getAuthRedirectFallback,
  getNativeAuthCompleteHref,
  getProfileSetupHref,
  getSignInHref,
  normalizeAuthRedirectTarget,
} from "@/lib/auth-redirect";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    [authRedirectParamName]?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: SignUpPageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, "/sign-up"),
  });
}

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
  const isNativeApp =
    isFriemiAndroidApp(userAgent) || isFriemiIOSApp(userAgent);
  const profileSetupTarget = getProfileSetupHref(locale, redirectTarget);
  const signedInRedirectUrl = isNativeApp
    ? getNativeAuthCompleteHref(locale, redirectTarget)
    : redirectTarget;
  const forceRedirectUrl = isNativeApp
    ? getNativeAuthCompleteHref(locale, profileSetupTarget)
    : profileSetupTarget;

  if (hasClerkKeys() && (await auth()).userId) {
    redirect(signedInRedirectUrl);
  }

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
    <PageContainer className="auth-page-shell min-h-svh max-w-none overflow-x-hidden overflow-y-auto bg-white px-5 pb-[calc(1rem+var(--app-bottom-safe-area))] pt-[calc(1.2rem+var(--app-top-safe-area))] sm:px-6">
      <section className="mx-auto flex min-h-[calc(100svh-2.2rem)] w-full max-w-[24rem] flex-col justify-start py-5 sm:justify-center">
        <ClerkAuthMountGuard
          exitUrl={withLocale(locale, "/mobile-home")}
          fallbackRedirectUrl={fallbackRedirectUrl}
          forceRedirectUrl={forceRedirectUrl}
          locale={locale}
          mode="sign-up"
          path={`/${locale}/sign-up`}
          secondaryUrl={getSignInHref(locale, redirectTarget)}
        />
      </section>
    </PageContainer>
  );
}
