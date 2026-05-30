import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageThread } from "@/features/direct-messages/components/DirectMessagesPanel";
import { DesktopFriendRosterPanel } from "@/features/direct-messages/components/DesktopFriendRosterPanel";
import {
  getDirectConversationThread,
  getDirectMessageFriendRoster,
} from "@/features/direct-messages/queries/getDirectMessages";
import { getPendingIncomingFriendRequests } from "@/features/friends/queries/getFriendsDashboard";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";

type MessageThreadPageProps = {
  params: Promise<{
    locale: string;
    conversationId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({
  params,
}: MessageThreadPageProps) {
  const { locale, conversationId } = await params;
  const profile = await ensureCurrentUserProfile(locale);
  const commonCopy = getCopy(locale).common;
  const [conversationResult, friendRosterResult, incomingRequests] =
    await Promise.all([
      getDirectConversationThread(profile.id, conversationId)
        .then((conversation) => ({ conversation, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load direct conversation thread", error);
          return { conversation: null, error };
        }),
      getDirectMessageFriendRoster(profile.id)
        .then((friends) => ({ friends, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load direct message friend roster", error);
          return { friends: [], error };
        }),
      getPendingIncomingFriendRequests(profile.id).catch((error: unknown) => {
        console.error("Failed to load incoming friend requests", error);

        return [];
      }),
    ]);

  if (conversationResult.error) {
    return (
      <PageContainer>
        <EmptyState
          title={commonCopy.loadFailed}
          description={commonCopy.retryDatabase}
        />
      </PageContainer>
    );
  }

  if (!conversationResult.conversation) {
    notFound();
  }

  return (
    <PageContainer className="py-0 md:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
      <MessageThread
        conversation={conversationResult.conversation}
        locale={locale}
      />
      <div className="hidden lg:block">
        {friendRosterResult.error ? (
          <EmptyState
            title={commonCopy.loadFailed}
            description={commonCopy.retryDatabase}
          />
        ) : (
          <DesktopFriendRosterPanel
            currentUserProfileId={profile.id}
            currentUserFriendCode={profile.friendCode}
            friends={friendRosterResult.friends}
            incomingRequests={incomingRequests}
            locale={locale}
            selectedConversationId={conversationResult.conversation.id}
          />
        )}
      </div>
    </PageContainer>
  );
}
