import { requireUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { getCopy } from "@/lib/copy";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewActivityPage({
  params,
}: NewActivityPageProps) {
  const { locale } = await params;
  const t = getCopy(locale);
  await requireUser(locale);

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          {t.newActivity.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {t.newActivity.description}
        </p>
      </div>

      <NewActivityForm locale={locale} />
    </PageContainer>
  );
}
