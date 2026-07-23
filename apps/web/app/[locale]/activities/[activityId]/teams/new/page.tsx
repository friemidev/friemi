import { notFound, redirect } from "next/navigation";
import { ensurePublicEventFromActivityInfo } from "@/features/public-events/queries/ensurePublicEventFromActivityInfo";
import { withLocale } from "@/lib/routes";

type NewActivityInfoTeamPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewActivityInfoTeamPage({
  params,
}: NewActivityInfoTeamPageProps) {
  const { locale, activityId } = await params;

  const publicEventId = await ensurePublicEventFromActivityInfo(activityId);

  if (!publicEventId) {
    notFound();
  }

  redirect(withLocale(locale, `/public-events/${publicEventId}/teams/new`));
}
