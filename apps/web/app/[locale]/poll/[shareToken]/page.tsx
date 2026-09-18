import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PollDetailView } from "@/features/polls/components/PollDetailView";
import { getSharedActivityPollView } from "@/features/polls/server/pollService";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

type PageProps = {
  params: Promise<{ locale: string; shareToken: string }>;
};

export default async function SharedActivityPollPage({ params }: PageProps) {
  const { locale, shareToken } = await params;
  const profile = await getOptionalCurrentUserProfileSnapshot();
  const poll = await getSharedActivityPollView({
    profileId: profile?.id ?? null,
    shareToken,
  });

  if (!poll) notFound();

  return (
    <PageContainer
      className="min-h-dvh max-w-[640px] bg-[#FEFFF9] pb-12 pt-4 sm:py-8"
      mobileSafeTop
    >
      <PollDetailView
        locale={locale}
        poll={poll}
        returnHref={withLocale(locale, "/mobile-home")}
      />
    </PageContainer>
  );
}
