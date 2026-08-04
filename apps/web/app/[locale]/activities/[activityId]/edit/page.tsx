import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import {
  getEditableActivityById,
  type EditableActivityResult,
} from "@/features/activities/queries/getEditableActivityById";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";

type EditActivityPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
};

export const dynamic = "force-dynamic";

function EditActivityUnavailablePage({
  activityId,
  description,
  locale,
  title,
}: {
  activityId: string;
  description: string;
  locale: string;
  title: string;
}) {
  const t = getCopy(locale);
  const detailHref = withLocale(locale, getActivityDetailPath(activityId));

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1rem] max-w-3xl space-y-6 max-md:px-5 max-md:py-0">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 md:hidden">
        <Link
          aria-label={title}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111210] ring-1 ring-[#D6D5B2] transition active:scale-95"
          href={detailHref}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </Link>
        <p className="truncate text-center text-[18px] font-black leading-none text-[#111210]">
          {title}
        </p>
      </div>

      <EmptyState title={title} description={description} />
    </PageContainer>
  );
}

function getLockedEditCopy(
  copy: ReturnType<typeof getCopy>["editActivity"],
  editableActivity: Extract<EditableActivityResult, { status: "locked" }>,
) {
  if (editableActivity.reason === "cancelled") {
    return {
      description: copy.lockedCancelledDescription,
      title: copy.lockedCancelledTitle,
    };
  }

  return {
    description: copy.lockedEndedDescription,
    title: copy.lockedEndedTitle,
  };
}

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const { locale, activityId } = await params;
  const t = getCopy(locale);
  const profile = await ensureCurrentUserProfile(
    locale,
    `/activities/${activityId}/edit`,
  );
  const editableActivity = await getEditableActivityById(
    activityId,
    profile.id,
  );

  if (editableActivity.status === "not-found") {
    notFound();
  }

  if (editableActivity.status === "forbidden") {
    return (
      <EditActivityUnavailablePage
        activityId={activityId}
        description={t.editActivity.forbiddenDescription}
        locale={locale}
        title={t.editActivity.forbiddenTitle}
      />
    );
  }

  if (editableActivity.status === "locked") {
    const lockedCopy = getLockedEditCopy(t.editActivity, editableActivity);

    return (
      <EditActivityUnavailablePage
        activityId={activityId}
        description={lockedCopy.description}
        locale={locale}
        title={lockedCopy.title}
      />
    );
  }

  return (
    <PageContainer className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          {t.editActivity.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {t.editActivity.description}
        </p>
      </div>

      <NewActivityForm
        activityId={editableActivity.activityId}
        cancelHref={withLocale(
          locale,
          getActivityDetailPath(editableActivity.activityId),
        )}
        initialValues={editableActivity.values}
        locale={locale}
        mode="edit"
      />
    </PageContainer>
  );
}
