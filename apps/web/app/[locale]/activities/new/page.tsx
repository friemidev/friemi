import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getActivityCopyValuesById } from "@/features/activities/queries/getActivityById";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { MobileNewActivityEntryView } from "@/features/activities/components/MobileNewActivityEntryView";
import { getActivityList } from "@/features/activities/queries/getActivities";
import { normalizeActivityFilterValues } from "@/features/activities/utils/activityFilters";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    copyActivityId?: string | string[];
    mode?: string | string[];
  }>;
};

function getMobileCreateHeaderCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler",
      publish: "Publier",
      title: "Créer une sortie",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      publish: "Publish",
      title: "Create plan",
    };
  }

  return {
    cancel: "取消",
    publish: "发布",
    title: "创建组局",
  };
}

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

  const formId = "new-activity-form";
  const headerCopy = getMobileCreateHeaderCopy(locale);
  const formContent = (
    <PageContainer className="max-w-3xl space-y-5 max-md:px-6">
      <div className="grid grid-cols-[4rem_minmax(0,1fr)_4rem] items-center py-1">
        <Link
          className="justify-self-start text-sm font-semibold text-zinc-600 transition hover:text-[#156240]"
          href={withLocale(locale, "/activities/new")}
        >
          {headerCopy.cancel}
        </Link>
        <h1 className="truncate text-center text-lg font-semibold text-ink">
          {headerCopy.title}
        </h1>
        <button
          className="h-9 rounded-full bg-[#006F52] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,111,82,0.18)] transition hover:bg-[#075f49]"
          form={formId}
          type="submit"
        >
          {headerCopy.publish}
        </button>
      </div>

      {copyActivityId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.form.copyTimeReminder}
        </div>
      ) : null}

      <NewActivityForm
        formId={formId}
        locale={locale}
        initialValues={initialValues ?? undefined}
        showFormActions={false}
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
