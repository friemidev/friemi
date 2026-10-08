import { ActiveGameToolFloatingWindow } from "./ActiveGameToolFloatingWindow";
import {
  getActiveGameToolRoomForProfile,
  getGameToolPrivateSeatPath,
  getGameToolRoomPath,
} from "../gameToolRooms";
import { withLocale } from "@/lib/routes";

export async function ActiveGameToolFloatingWindowLoader({
  locale,
  profileId,
}: {
  locale: string;
  profileId: string;
}) {
  // This optional shortcut must not delay the page or fail the shared layout.
  const room = await getActiveGameToolRoomForProfile({ profileId }).catch(
    (error: unknown) => {
      console.error("Failed to load active game shortcut", error);
      return null;
    },
  );
  const privateSeatPath = room?.privateSeatToken
    ? getGameToolPrivateSeatPath({
        kind: room.kind,
        privateSeatToken: room.privateSeatToken,
      })
    : null;
  return (
    <ActiveGameToolFloatingWindow
      locale={locale}
      activeRoom={
        room
          ? {
              code: room.code,
              href: withLocale(
                locale,
                getGameToolRoomPath({ kind: room.kind, roomId: room.id }),
              ),
              id: room.id,
              kind: room.kind,
              privateSeatHref: privateSeatPath
                ? withLocale(locale, privateSeatPath)
                : null,
              seatNumber: room.seatNumber,
              title: room.title,
            }
          : null
      }
    />
  );
}
