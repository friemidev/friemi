import type { Metadata } from "next";
import { FootprintsMobilePage } from "@/features/moments/components/FootprintsMobilePage";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import { ensureCurrentUserProfile } from "@/lib/auth";

type FootprintsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: FootprintsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "zh-CN" ? "足迹" : "Trace";

  return {
    title: `${title} | Friemi`,
  };
}

export default async function FootprintsPage({
  params,
  searchParams,
}: FootprintsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const initialTab = query?.tab === "message" ? "message" : "moment";
  const profile = await ensureCurrentUserProfile(locale, "/footprints");
  const messageFriendsResult = await getDirectMessageFriendRoster(profile.id)
    .then((friends) => ({ friends, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load footprints message roster", error);

      return {
        friends: [],
        error,
      };
    });

  return (
    <FootprintsMobilePage
      locale={locale}
      initialTab={initialTab}
      messageFriends={messageFriendsResult.friends}
      messageRosterError={Boolean(messageFriendsResult.error)}
      profile={{
        id: profile.id,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        friendCode: profile.friendCode,
      }}
    />
  );
}
