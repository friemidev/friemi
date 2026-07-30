import { redirect } from "next/navigation";
import { withLocale } from "@/lib/routes";

type FriendsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    friendCode?: string;
  }>;
};

export default async function FriendsPage({
  params,
  searchParams,
}: FriendsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const friendCode =
    typeof query?.friendCode === "string" ? query.friendCode.trim() : "";

  if (friendCode) {
    redirect(
      withLocale(
        locale,
        `/search?${new URLSearchParams({ q: friendCode }).toString()}`,
      ),
    );
  }

  redirect(withLocale(locale, "/profile/network"));
}
