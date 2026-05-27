import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { getEditableActivityById } from "@/features/activities/queries/getEditableActivityById";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

type EditActivityPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const { locale, activityId } = await params;
  const t = getCopy(locale);
  const profile = await ensureCurrentUserProfile(locale);
  const editableActivity = await getEditableActivityById(
    activityId,
    profile.id,
  );

  if (editableActivity.status === "not-found") {
    notFound();
  }

  if (editableActivity.status === "forbidden") {
    return (
      <PageContainer className="max-w-3xl">
        <EmptyState
          title={t.editActivity.forbiddenTitle}
          description={t.editActivity.forbiddenDescription}
        />
      </PageContainer>
    );
  }

  if (editableActivity.status === "locked") {
    return (
      <PageContainer className="max-w-3xl">
        <EmptyState
          title={t.editActivity.lockedTitle}
          description={t.editActivity.lockedDescription}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl space-y-6">
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
          `/activities/${editableActivity.activityId}`,
        )}
        initialValues={editableActivity.values}
        locale={locale}
        mode="edit"
      />
    </PageContainer>
  );
}
