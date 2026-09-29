import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { WechatShareConfigurator } from "@/features/activities/components/WechatShareConfigurator";
import { PollDetailView } from "@/features/polls/components/PollDetailView";
import {
  getSharedActivityPollMetadata,
  getSharedActivityPollView,
} from "@/features/polls/server/pollService";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import {
  buildCanonicalUrl,
  buildDetailShareMetadata,
  buildPollShareImageUrl,
  getCanonicalMetadataBaseUrl,
  getRequestBaseUrl,
  shareCardVersion,
} from "@/lib/share-metadata";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; shareToken: string }>;
};

function getPollShareDescription({
  activityTitle,
  description,
  locale,
}: {
  activityTitle: string;
  description: string | null;
  locale: string;
}) {
  const detail = description?.trim();

  if (locale === "fr") {
    return detail
      ? `Sondage de « ${activityTitle} » : ${detail}`
      : `Participez au sondage de « ${activityTitle} ».`;
  }

  if (locale === "en") {
    return detail
      ? `Poll for “${activityTitle}”: ${detail}`
      : `Open the poll for “${activityTitle}” and cast your vote.`;
  }

  return detail
    ? `「${activityTitle}」投票：${detail}`
    : `参与「${activityTitle}」的投票，打开链接进行选择。`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, shareToken } = await params;
  const requestBaseUrl = getRequestBaseUrl(await headers());
  const canonicalUrl = buildCanonicalUrl(
    getCanonicalMetadataBaseUrl(),
    withLocale(locale, `/poll/${shareToken}`),
  );
  const poll = await getSharedActivityPollMetadata(shareToken);

  if (!poll) {
    return {
      alternates: { canonical: canonicalUrl },
      robots: { follow: false, index: false },
      title: "Friemi",
    };
  }

  return {
    ...buildDetailShareMetadata({
      canonicalUrl,
      coverImageUrl: poll.coverImageUrl,
      description: getPollShareDescription({
        activityTitle: poll.activityTitle,
        description: poll.description,
        locale,
      }),
      shareImage: {
        height: 420,
        type: "image/png",
        url: buildPollShareImageUrl({
          baseUrl: requestBaseUrl,
          locale,
          shareToken,
          variant: "wechat",
        }),
        width: 420,
      },
      title: poll.question,
    }),
    alternates: { canonical: canonicalUrl },
    robots: { follow: false, index: false },
  };
}

export default async function SharedActivityPollPage({ params }: PageProps) {
  const { locale, shareToken } = await params;
  const [profile, requestHeaders] = await Promise.all([
    getOptionalCurrentUserProfileSnapshot(),
    headers(),
  ]);
  const poll = await getSharedActivityPollView({
    profileId: profile?.id ?? null,
    shareToken,
  });

  if (!poll) notFound();

  const requestBaseUrl = getRequestBaseUrl(requestHeaders);
  const shareUrl = buildCanonicalUrl(
    requestBaseUrl,
    withLocale(locale, `/poll/${shareToken}`),
    { share: shareCardVersion },
  );
  const shareDescription = getPollShareDescription({
    activityTitle: poll.activity.title,
    description: poll.description,
    locale,
  });

  return (
    <>
      <WechatShareConfigurator
        description={shareDescription}
        enabled
        imageUrl={buildPollShareImageUrl({
          baseUrl: requestBaseUrl,
          locale,
          shareToken,
          variant: "wechat",
        })}
        link={shareUrl}
        title={poll.question}
      />
      <PageContainer
        className="shared-poll-page min-h-dvh max-w-[640px] bg-[#FEFFF9] pb-12 pt-4 sm:py-8"
        mobileSafeTop
      >
        <PollDetailView
          locale={locale}
          poll={poll}
          returnHref={withLocale(locale, "/mobile-home")}
        />
      </PageContainer>
    </>
  );
}
