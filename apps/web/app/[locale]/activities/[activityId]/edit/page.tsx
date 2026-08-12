import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
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

function getUnavailableBackLabel(locale: string) {
  if (locale === "fr") {
    return "Retour au détail";
  }

  if (locale === "en") {
    return "Back to detail";
  }

  return "返回详情";
}

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
  const detailHref = withLocale(locale, getActivityDetailPath(activityId));
  const backLabel = getUnavailableBackLabel(locale);

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:3.25rem] [--app-mobile-page-bottom-gap:1rem] max-w-3xl max-md:px-5 max-md:py-0 md:py-14">
      <div className="space-y-7">
        <Link
          aria-label={backLabel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111210] ring-1 ring-[#D6D5B2] transition active:scale-95"
          href={detailHref}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </Link>

        <section className="mx-auto flex w-full max-w-[24rem] flex-col items-center text-center">
          <div className="flex h-44 w-44 items-center justify-center overflow-hidden sm:h-52 sm:w-52">
            <Image
              src="/illustrations/ui/not-ok-yet.png"
              alt=""
              width={2048}
              height={2048}
              priority
              className="h-full w-full scale-[1.18] object-contain"
            />
          </div>

          <div className="mt-3 w-full space-y-2 rounded-[1.35rem] bg-white px-5 py-6 text-center shadow-none ring-1 ring-[#E7E1CA]">
            <h1 className="text-[1.35rem] font-bold leading-tight text-[#111210]">
              {title}
            </h1>
            <p className="text-sm font-medium leading-6 text-zinc-500">
              {description}
            </p>
          </div>
        </section>
      </div>
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
