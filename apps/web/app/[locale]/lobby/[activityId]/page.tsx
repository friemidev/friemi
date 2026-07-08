import {
  ActivityDetailPageContent,
  generateLobbyActivityDetailMetadata,
} from "@/features/activities/pages/ActivityDetailPageContent";

export const dynamic = "force-dynamic";

export const generateMetadata = generateLobbyActivityDetailMetadata;

type LobbyActivityDetailPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
  searchParams: Promise<{
    access?: string;
    claimed?: string;
  }>;
};

export default function LobbyActivityDetailPage(
  props: LobbyActivityDetailPageProps,
) {
  return <ActivityDetailPageContent {...props} routeKind="lobby" />;
}
