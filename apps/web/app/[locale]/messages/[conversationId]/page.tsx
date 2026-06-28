import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageThread } from "@/features/direct-messages/components/DirectMessagesPanel";
import { DesktopFriendRosterPanel } from "@/features/direct-messages/components/DesktopFriendRosterPanel";
import { IncomingFriendRequestsPanel } from "@/features/friends/components/FriendsDashboard";
import {
  getDirectConversationActivityContext,
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
  searchParams: Promise<{
    access?: string;
    activityId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({
  params,
  searchParams,
}: MessageThreadPageProps) {
  const { locale, conversationId } = await params;
  const { access: accessToken, activityId } = await searchParams;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/messages/${conversationId}`,
  );
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

  const activityContext = activityId
    ? await getDirectConversationActivityContext({
        accessToken,
        activityId,
        currentUserProfileId: profile.id,
        peerProfileId: conversationResult.conversation.peer.id,
      }).catch((error: unknown) => {
        console.error("Failed to load direct message activity context", error);

        return null;
      })
    : null;

  return (
    <PageContainer className="max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(5.05rem+env(safe-area-inset-bottom))] max-md:top-[calc(4rem+3px)] max-md:z-30 max-md:max-w-none max-md:overflow-hidden max-md:px-0 max-md:pb-0 max-md:pt-0 md:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
      <div className="flex h-full min-h-0 flex-col gap-3 md:grid md:gap-4">
        <IncomingFriendRequestsPanel
          className="lg:hidden"
          incomingRequests={incomingRequests}
          locale={locale}
          redirectPath={`/messages/${conversationResult.conversation.id}`}
          returnTo="messages"
        />
        <MessageThread
          activityContext={activityContext}
          conversation={conversationResult.conversation}
          locale={locale}
        />
      </div>
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
