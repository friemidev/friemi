import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getActivityCopyValuesById } from "@/features/activities/queries/getActivityById";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { MobileNewActivityEntryView } from "@/features/activities/components/MobileNewActivityEntryView";
import { getActivityList } from "@/features/activities/queries/getActivities";
import { normalizeActivityFilterValues } from "@/features/activities/utils/activityFilters";
import { getCopy } from "@/lib/copy";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    copyActivityId?: string | string[];
    mode?: string | string[];
  }>;
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
  const mode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;
  const showForm = mode === "form" || Boolean(copyActivityId);
  const initialValues = copyActivityId
    ? await getActivityCopyValuesById(copyActivityId, profile.id)
    : undefined;
  const activityPreviewList = showForm
    ? null
    : await getActivityList(
        normalizeActivityFilterValues({
          page: "1",
          relation: "ALL",
          sort: "soonest",
          timeStates: "UPCOMING,ONGOING",
          view: "card",
        }),
        {
          pageSize: 6,
          publicInfoOnly: true,
          viewerProfileId: profile.id,
        },
      ).catch((error: unknown) => {
        console.error("Failed to load mobile new activity preview", error);
        return null;
      });

  if (copyActivityId && !initialValues) {
    notFound();
  }

  const formContent = (
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

  if (showForm) {
    return formContent;
  }

  return (
    <>
      <MobileNewActivityEntryView
        activities={activityPreviewList?.activities ?? []}
        locale={locale}
      />
      <div className="hidden md:block">{formContent}</div>
    </>
  );
}
