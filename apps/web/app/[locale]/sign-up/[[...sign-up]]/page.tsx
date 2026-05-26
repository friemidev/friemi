import { SignUp } from "@clerk/nextjs";
import { PageContainer } from "@/components/layout/PageContainer";
import { hasClerkKeys } from "@/lib/clerk";
import { getCopy } from "@/lib/copy";

type SignUpPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  const t = getCopy(locale);

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
