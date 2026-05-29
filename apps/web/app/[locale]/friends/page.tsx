import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendsDashboard } from "@/features/friends/components/FriendsDashboard";
import { getFriendsCopy } from "@/features/friends/copy";
import { getFriendsDashboard } from "@/features/friends/queries/getFriendsDashboard";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";

type FriendsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function FriendsPage({ params }: FriendsPageProps) {
  const { locale } = await params;
  const t = getFriendsCopy(locale);
  const commonCopy = getCopy(locale).common;
  const profile = await ensureCurrentUserProfile(locale);
  const dashboardResult = await getFriendsDashboard(profile.id)
    .then((dashboard) => ({ dashboard, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load friends dashboard", error);
      return {
        dashboard: {
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
        },
        error,
      };
    });

  return (
    <PageContainer className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-medium text-moss">{t.entryTitle}</p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          {t.title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
          {t.description}
        </p>
      </section>

      {dashboardResult.error ? (
        <EmptyState
          title={commonCopy.loadFailed}
          description={commonCopy.retryDatabase}
        />
      ) : (
        <FriendsDashboard
          dashboard={dashboardResult.dashboard}
          locale={locale}
        />
      )}
    </PageContainer>
  );
}
