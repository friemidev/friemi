import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoConversationSelected } from "@/features/direct-messages/components/DirectMessagesPanel";
import { DesktopFriendRosterPanel } from "@/features/direct-messages/components/DesktopFriendRosterPanel";
import { MobileFriendChatRoster } from "@/features/direct-messages/components/MobileFriendChatRoster";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";

type MessagesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale);
  const commonCopy = getCopy(locale).common;
  const friendRosterResult = await getDirectMessageFriendRoster(profile.id)
    .then((friends) => ({ friends, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load direct message friend roster", error);
      return { friends: [], error };
    });

  return (
    <PageContainer className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5 lg:space-y-0">
      {friendRosterResult.error ? (
        <div className="lg:hidden">
          <EmptyState
            title={commonCopy.loadFailed}
            description={commonCopy.retryDatabase}
          />
        </div>
      ) : (
        <MobileFriendChatRoster
          currentUserProfileId={profile.id}
          friends={friendRosterResult.friends}
          locale={locale}
        />
      )}

      <div className="hidden lg:contents">
        {friendRosterResult.error ? (
          <div className="lg:col-span-2">
            <EmptyState
              title={commonCopy.loadFailed}
              description={commonCopy.retryDatabase}
            />
          </div>
        ) : (
          <>
            <NoConversationSelected locale={locale} />
            <DesktopFriendRosterPanel
              currentUserProfileId={profile.id}
              friends={friendRosterResult.friends}
              locale={locale}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
