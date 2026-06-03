import { SignUp } from "@clerk/nextjs";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { WechatWebViewGuide } from "@/features/auth/components/WechatWebViewGuide";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function isWechatWebView(userAgent: string | null) {
  return /MicroMessenger/i.test(userAgent ?? "");
}

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  const t = getCopy(locale);
  const requestHeaders = await headers();

  if (isWechatWebView(requestHeaders.get("user-agent"))) {
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
      <SignUp
        path={`/${locale}/sign-up`}
        routing="path"
        signInUrl={`/${locale}/sign-in`}
      />
    </PageContainer>
  );
}
