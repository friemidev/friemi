import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { PollCreateForm } from "@/features/polls/components/PollCreateForm";
import { getPollCopy } from "@/features/polls/copy";
import { getActivityPollList } from "@/features/polls/server/pollService";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; activityId: string }>;
};

export default async function NewActivityPollPage({ params }: PageProps) {
  const { activityId, locale } = await params;
  const profile = await ensureCurrentUserProfileSnapshot(
    locale,
    `/lobby/${activityId}/polls/new`,
  );
  const data = await getActivityPollList(activityId, profile.id);
  if (!data?.canCreate) notFound();
  const copy = getPollCopy(locale);

  return (
    <PageContainer
      className="max-w-[640px] space-y-6 bg-[#FEFFF9] pb-24 pt-4 sm:py-8"
      mobileSafeBottom
      mobileSafeTop
    >
      <MobileNavSectionOverride section="activities" />
      <header className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center">
        <Link
          aria-label={copy.back}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E3DFD0] bg-white text-[#156240]"
          href={withLocale(locale, `/lobby/${activityId}/polls`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="text-[18px] font-black text-[#1D1D1B]">
            {copy.create}
          </h1>
          <p className="truncate text-xs font-semibold text-[#7C827A]">
            {data.activity.title}
          </p>
        </div>
        <span />
      </header>
      <PollCreateForm activityId={activityId} locale={locale} />
    </PageContainer>
  );
}
