import { requireUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewActivityPage({
  params,
}: NewActivityPageProps) {
  const { locale } = await params;
  await requireUser(locale);

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          发起活动
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          填写活动信息后会写入数据库，并跳转到新活动详情页。
        </p>
      </div>

      <NewActivityForm locale={locale} />
    </PageContainer>
  );
}
