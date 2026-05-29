import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ConversationListPanel,
  MessageThread,
} from "@/features/direct-messages/components/DirectMessagesPanel";
import {
  getDirectConversations,
  getDirectConversationThread,
} from "@/features/direct-messages/queries/getDirectMessages";
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
  const [conversationResult, conversationsResult] = await Promise.all([
    getDirectConversationThread(profile.id, conversationId)
      .then((conversation) => ({ conversation, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load direct conversation thread", error);
        return { conversation: null, error };
      }),
    getDirectConversations(profile.id)
      .then((conversations) => ({ conversations, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load direct conversations", error);
        return { conversations: [], error };
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
    <PageContainer className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5 lg:space-y-0">
      <MessageThread
        conversation={conversationResult.conversation}
        locale={locale}
      />
      <div className="hidden lg:block">
        {conversationsResult.error ? (
          <EmptyState
            title={commonCopy.loadFailed}
            description={commonCopy.retryDatabase}
          />
        ) : (
          <ConversationListPanel
            conversations={conversationsResult.conversations}
            currentUserProfileId={profile.id}
            locale={locale}
            selectedConversationId={conversationResult.conversation.id}
          />
        )}
      </div>
    </PageContainer>
  );
}
