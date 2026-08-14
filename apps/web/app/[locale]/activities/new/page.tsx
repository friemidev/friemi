import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ensureCurrentUserProfile,
  getOptionalCurrentUserProfileSnapshot,
} from "@/lib/auth";
import { getActivityCopyValuesById } from "@/features/activities/queries/getActivityById";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCreateCancelControl } from "@/features/activities/components/ActivityCreateCancelControl";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { MobileNewActivityEntryView } from "@/features/activities/components/MobileNewActivityEntryView";
import { getActivityList } from "@/features/activities/queries/getActivities";
import { normalizeActivityFilterValues } from "@/features/activities/utils/activityFilters";
import { getSignInHref } from "@/lib/auth-redirect";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    copyActivityId?: string | string[];
    mode?: string | string[];
    return?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: NewActivityPageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, "/activities/new"),
  });
}

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
    title: "创建聚吧",
  };
}

export default async function NewActivityPage({
  params,
  searchParams,
}: NewActivityPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const t = getCopy(locale);
  const copyActivityId = Array.isArray(resolvedSearchParams.copyActivityId)
    ? resolvedSearchParams.copyActivityId[0]
    : resolvedSearchParams.copyActivityId;
  const mode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;
  const returnModeParam = Array.isArray(resolvedSearchParams.return)
    ? resolvedSearchParams.return[0]
    : resolvedSearchParams.return;
  const cancelReturnMode = returnModeParam === "history" ? "history" : "path";
  const showForm = mode === "form" || Boolean(copyActivityId);
  const profile = await (copyActivityId
    ? ensureCurrentUserProfile(
        locale,
        `/activities/new?copyActivityId=${encodeURIComponent(copyActivityId)}${
          cancelReturnMode === "history" ? "&return=history" : ""
        }`,
      )
    : getOptionalCurrentUserProfileSnapshot());
  const initialValues =
    copyActivityId && profile
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
          viewerProfileId: profile?.id ?? null,
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
    <PageContainer
      className="max-w-3xl space-y-5 max-md:px-6"
      mobileSafeBottom
      mobileSafeTop
    >
      <div className="grid grid-cols-[minmax(3rem,max-content)_minmax(0,1fr)_minmax(3rem,max-content)] items-center gap-2 py-1">
        <ActivityCreateCancelControl
          className="max-w-[5.5rem] justify-self-start truncate whitespace-nowrap text-sm font-semibold text-zinc-600 transition hover:text-[#156240]"
          fallbackHref={withLocale(locale, "/activities/new")}
          label={headerCopy.cancel}
          returnMode={cancelReturnMode}
        />
        <h1 className="truncate text-center text-lg font-semibold text-ink">
          {headerCopy.title}
        </h1>
        <button
          className="inline-flex h-9 max-w-[5.75rem] items-center justify-center justify-self-end overflow-hidden whitespace-nowrap rounded-full bg-[#006F52] px-3 text-sm font-semibold leading-none text-white shadow-[0_8px_18px_rgba(0,111,82,0.18)] transition hover:bg-[#075f49]"
          form={formId}
          type="submit"
        >
          <span className="truncate">{headerCopy.publish}</span>
        </button>
      </div>

      {copyActivityId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.form.copyTimeReminder}
        </div>
      ) : null}

      <NewActivityForm
        formId={formId}
        isAuthenticated={Boolean(profile)}
        locale={locale}
        initialValues={initialValues ?? undefined}
        signInHref={getSignInHref(
          locale,
          copyActivityId
            ? `/activities/new?copyActivityId=${encodeURIComponent(copyActivityId)}${
                cancelReturnMode === "history" ? "&return=history" : ""
              }`
            : showForm
              ? "/activities/new?mode=form"
              : "/activities/new",
        )}
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
