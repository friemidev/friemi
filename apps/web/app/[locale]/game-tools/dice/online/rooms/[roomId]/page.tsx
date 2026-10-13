import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DiceOnlineRoom } from "@/features/game-tools/components/DiceOnlineRoom";
import { isDiceEnabled } from "@/features/game-tools/diceAvailability";
import { getDiceRoomView } from "@/features/game-tools/diceRoomServer";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { withLocale } from "@/lib/routes";
export default async function DiceOnlineRoomPage({ params }: { params: Promise<{ locale: string; roomId: string }> }) {
  if (!isDiceEnabled()) notFound();
  const { locale, roomId } = await params;
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) redirect(withLocale(locale, "/game-tools/dice/online"));
  const result = await getDiceRoomView(roomId, profileId);
  if (!("room" in result) || !result.room) notFound();
  return <PageContainer className="max-w-[68rem] dice-online-page pb-4 pt-5" mobileSafeTop><DiceOnlineRoom initialRoom={result.room} locale={locale} /></PageContainer>;
}
