import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonLiveRefresh } from "@/features/game-tools/components/AvalonLiveRefresh";
import { AvalonPrivateRoleCard } from "@/features/game-tools/components/AvalonPrivateRoleCard";
import type { AvalonPrivatePayload } from "@/features/game-tools/avalonConfig";
import { getAvalonSeatByToken } from "@/features/game-tools/queries/getAvalonRoom";
import { normalizeAvalonRoomState } from "@/features/game-tools/avalonRoomState";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type AvalonSeatPageProps = {
  params: Promise<{
    locale: string;
    token: string;
  }>;
};

function parsePrivatePayload(value: unknown): AvalonPrivatePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<AvalonPrivatePayload>;

  if (
    typeof payload.alignmentLabel !== "string" ||
    typeof payload.roleDescription !== "string" ||
    typeof payload.roleLabel !== "string" ||
    !Array.isArray(payload.visibleHints)
  ) {
    return null;
  }

  return {
    alignmentLabel: payload.alignmentLabel,
    roleDescription: payload.roleDescription,
    roleLabel: payload.roleLabel,
    visibleHints: payload.visibleHints
      .filter(
        (hint): hint is AvalonPrivatePayload["visibleHints"][number] =>
          Boolean(hint) &&
          typeof hint === "object" &&
          typeof hint.displayName === "string" &&
          typeof hint.label === "string" &&
          typeof hint.seatNumber === "number",
      )
      .map((hint) => ({
        displayName: hint.displayName,
        label: hint.label,
        roleKey: hint.roleKey,
        seatNumber: hint.seatNumber,
      })),
  };
}

export async function generateMetadata({
  params,
}: AvalonSeatPageProps): Promise<Metadata> {
  const { locale, token } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Private Avalon seat identity on Friemi.",
    path: withLocale(locale, `/game-tools/avalon/seats/${token}`),
    title: `Private Avalon Seat · ${brand.name}`,
  });
}

export default async function AvalonSeatPage({ params }: AvalonSeatPageProps) {
  const { locale, token } = await params;
  const seat = await getAvalonSeatByToken({ token });

  if (!seat) {
    notFound();
  }

  return (
    <PageContainer className="max-w-2xl pb-28 pt-4 sm:pb-12 sm:pt-7">
      <AvalonLiveRefresh enabled={seat.room.status !== "FINISHED"} />
      <AvalonPrivateRoleCard
        locale={locale}
        payload={parsePrivatePayload(seat.privatePayload)}
        privateToken={seat.privateToken}
        roleKey={seat.roleKey}
        roomSeats={seat.room.seats}
        roomState={normalizeAvalonRoomState(seat.room.state)}
        roomStatus={seat.room.status}
        roomSubmissions={seat.room.submissions}
        seatId={seat.id}
        seatDisplayName={seat.displayName}
        seatNumber={seat.seatNumber}
      />
    </PageContainer>
  );
}
