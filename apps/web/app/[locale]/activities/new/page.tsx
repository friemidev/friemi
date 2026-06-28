import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getActivityCopyValuesById } from "@/features/activities/queries/getActivityById";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { getCopy } from "@/lib/copy";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{ copyActivityId?: string | string[] }>;
};

export default async function NewActivityPage({
  params,
  searchParams,
}: NewActivityPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const t = getCopy(locale);
  const profile = await ensureCurrentUserProfile(locale, "/activities/new");
  const copyActivityId = Array.isArray(resolvedSearchParams.copyActivityId)
    ? resolvedSearchParams.copyActivityId[0]
    : resolvedSearchParams.copyActivityId;
  const initialValues = copyActivityId
    ? await getActivityCopyValuesById(copyActivityId, profile.id)
    : undefined;

  if (copyActivityId && !initialValues) {
    notFound();
  }

  return (
      <PageContainer className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          {t.newActivity.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {t.newActivity.description}
        </p>
      </div>

      {copyActivityId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.form.copyTimeReminder}
        </div>
      ) : null}

      <NewActivityForm
        locale={locale}
        initialValues={initialValues ?? undefined}
      />
    </PageContainer>
  );
}
