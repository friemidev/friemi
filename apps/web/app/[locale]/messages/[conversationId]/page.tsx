import { Suspense } from "react";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { DirectMessageUnreadCountHydrator } from "@/features/direct-messages/components/DirectMessageUnreadCountHydrator";
import { MessageThread } from "@/features/direct-messages/components/DirectMessagesPanel";
import { DesktopFriendRosterPanel } from "@/features/direct-messages/components/DesktopFriendRosterPanel";
import {
  getDirectConversationActivityContext,
  getDirectConversationThread,
  getDirectMessageFriendRoster,
  getUnreadDirectMessageConversationCount,
  markDirectConversationRead,
} from "@/features/direct-messages/queries/getDirectMessages";
import { getPendingIncomingFriendRequests } from "@/features/friends/queries/getFriendsDashboard";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { isMobileUserAgent } from "@/lib/mobile-root-lobby-entry";
import { createPerformanceTracker } from "@/lib/performance";
import { prisma } from "@/lib/prisma";

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
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const isMobileRequest = isMobileUserAgent(userAgent);
  const perf = createPerformanceTracker({
    locale,
    route: "/messages/[conversationId]",
  });
  const profile = await perf.measure("viewer.profile", () =>
    ensureCurrentUserProfile(locale, `/messages/${conversationId}`),
  );
  const commonCopy = getCopy(locale).common;
  const conversationResult = await perf
    .measure("messages.thread", () =>
      getDirectConversationThread(profile.id, conversationId),
    )
    .then((conversation) => ({ conversation, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load direct conversation thread", error);
      return { conversation: null, error };
    });

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

  const conversation = conversationResult.conversation;
  await perf.measure("messages.markRead", () =>
    markDirectConversationRead({
      conversationId: conversation.id,
      peerProfileId: conversation.peer.id,
    }),
  );
  const unreadDirectMessageCount = await perf.measure(
    "messages.unreadDirectMessageCount",
    () => getUnreadDirectMessageConversationCount(profile.id),
  );

  after(() => {
    void prisma.notification
      .updateMany({
        where: {
          actorId: conversation.peer.id,
          readAt: null,
          recipientId: profile.id,
          type: "DIRECT_MESSAGE",
        },
        data: {
          readAt: new Date(),
        },
      })
      .catch((error: unknown) => {
        console.error(
          "Failed to mark direct message notifications read",
          error,
        );
      });
  });

  const activityContext = activityId
    ? await perf
        .measure("messages.activityContext", () =>
          getDirectConversationActivityContext({
            accessToken,
            activityId,
            currentUserProfileId: profile.id,
            peerProfileId: conversation.peer.id,
          }),
        )
        .catch((error: unknown) => {
          console.error(
            "Failed to load direct message activity context",
            error,
          );

          return null;
        })
    : null;
  perf.finish(
    {
      hasActivityContext: Boolean(activityContext),
      isMobileRequest,
      messageCount: conversation.messages.length,
    },
    {
      route: `/${locale}/messages/${conversationId}`,
      routeKey: "message_thread",
      sourceSurface: "messages",
      userAgent,
      userProfileId: profile.id,
    },
  );

  return (
    <PageContainer className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:max-w-none max-md:overflow-hidden max-md:px-0 max-md:pb-0 max-md:pt-0 md:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
      <DirectMessageUnreadCountHydrator
        unreadCount={unreadDirectMessageCount}
      />
      <div className="flex h-full min-h-0 flex-col gap-3 md:grid md:gap-4">
        <MessageThread
          activityContext={activityContext}
          backHref="/footprints?tab=message"
          conversation={conversation}
          locale={locale}
        />
      </div>
      {isMobileRequest ? null : (
        <Suspense fallback={<div className="hidden lg:block" />}>
          <DesktopConversationSidebar
            accessToken={accessToken}
            activityId={activityId}
            currentUserFriendCode={profile.friendCode}
            currentUserProfileId={profile.id}
            locale={locale}
            selectedConversationId={conversation.id}
          />
        </Suspense>
      )}
    </PageContainer>
  );
}

async function DesktopConversationSidebar({
  accessToken,
  activityId,
  currentUserFriendCode,
  currentUserProfileId,
  locale,
  selectedConversationId,
}: {
  accessToken?: string;
  activityId?: string;
  currentUserFriendCode?: string | null;
  currentUserProfileId: string;
  locale: string;
  selectedConversationId: string;
}) {
  const commonCopy = getCopy(locale).common;
  const [friendRosterResult, incomingRequests] = await Promise.all([
    getDirectMessageFriendRoster(currentUserProfileId)
      .then((friends) => ({ friends, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load direct message friend roster", error);
        return { friends: [], error };
      }),
    getPendingIncomingFriendRequests(currentUserProfileId).catch(
      (error: unknown) => {
        console.error("Failed to load incoming friend requests", error);

        return [];
      },
    ),
  ]);

  return (
    <div className="hidden lg:block">
      {friendRosterResult.error ? (
        <EmptyState
          title={commonCopy.loadFailed}
          description={commonCopy.retryDatabase}
        />
      ) : (
        <DesktopFriendRosterPanel
          activityContextQuery={
            activityId
              ? {
                  accessToken,
                  activityId,
                }
              : null
          }
          currentUserProfileId={currentUserProfileId}
          currentUserFriendCode={currentUserFriendCode}
          friends={friendRosterResult.friends}
          incomingRequests={incomingRequests}
          locale={locale}
          selectedConversationId={selectedConversationId}
        />
      )}
    </div>
  );
}
