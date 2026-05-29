import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ConversationListPanel,
  NoConversationSelected,
} from "@/features/direct-messages/components/DirectMessagesPanel";
import { getDirectMessagesCopy } from "@/features/direct-messages/copy";
import { getDirectConversations } from "@/features/direct-messages/queries/getDirectMessages";
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
  const t = getDirectMessagesCopy(locale);
  const commonCopy = getCopy(locale).common;
  const conversationsResult = await getDirectConversations(profile.id)
    .then((conversations) => ({ conversations, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load direct conversations", error);
      return { conversations: [], error };
    });

  return (
    <PageContainer className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5 lg:space-y-0">
      <section className="space-y-2 lg:hidden">
        <p className="text-sm font-medium text-moss">{t.listTitle}</p>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          {t.title}
        </h1>
        <p className="text-sm leading-6 text-zinc-600">{t.description}</p>
      </section>
      {conversationsResult.error ? (
        <div className="lg:col-span-2">
          <EmptyState
            title={commonCopy.loadFailed}
            description={commonCopy.retryDatabase}
          />
        </div>
      ) : (
        <>
          <NoConversationSelected locale={locale} />
          <ConversationListPanel
            conversations={conversationsResult.conversations}
            currentUserProfileId={profile.id}
            locale={locale}
          />
        </>
      )}
    </PageContainer>
  );
}
