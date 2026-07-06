import { notFound, redirect } from "next/navigation";
import { getWerewolfRoomByCode } from "@/features/game-tools/queries/getWerewolfRoom";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type WerewolfJoinPageProps = {
  params: Promise<{
    code: string;
    locale: string;
  }>;
};

export default async function WerewolfJoinPage({
  params,
}: WerewolfJoinPageProps) {
  const { code, locale } = await params;
  const viewerProfile = await getOptionalCurrentUserProfile();
  const room = await getWerewolfRoomByCode({
    code,
    locale,
    viewerProfile,
  });

  if (!room) {
    notFound();
  }

  redirect(withLocale(locale, `/game-tools/werewolf/rooms/${room.id}`));
}
