import { SignUp } from "@clerk/nextjs";
import { PageContainer } from "@/components/layout/PageContainer";
import { hasClerkKeys } from "@/lib/clerk";

type SignUpPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;

  if (!hasClerkKeys()) {
    return (
      <PageContainer className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-black/10 bg-white/80 p-6 text-center">
          <h1 className="text-xl font-semibold text-ink">Clerk 尚未配置</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">填写 `.env.local` 中的 Clerk key 后，这里会显示真实注册组件。</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center">
      <SignUp path={`/${locale}/sign-up`} routing="path" signInUrl={`/${locale}/sign-in`} />
    </PageContainer>
  );
}
