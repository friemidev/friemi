import { notFound, redirect } from "next/navigation";
import { getAvalonRoomByCode } from "@/features/game-tools/queries/getAvalonRoom";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type AvalonJoinPageProps = {
  params: Promise<{
    code: string;
    locale: string;
  }>;
};

export default async function AvalonJoinPage({ params }: AvalonJoinPageProps) {
  const { code, locale } = await params;
  const viewerProfile = await getOptionalCurrentUserProfile();
  const room = await getAvalonRoomByCode({
    code,
    locale,
    viewerProfile,
  });

  if (!room) {
    notFound();
  }

  redirect(withLocale(locale, `/game-tools/avalon/rooms/${room.id}`));
}
