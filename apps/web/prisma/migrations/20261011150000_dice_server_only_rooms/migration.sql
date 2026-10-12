BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- Full dice hands are stored in GameToolRoom.state. Browser roles can only
-- read their own filtered snapshot through the authenticated application API.
CREATE POLICY dice_server_only_room
  ON public."GameToolRoom" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (kind::text <> 'DICE') WITH CHECK (kind::text <> 'DICE');

-- Direct browser writes must not replace a seat or member before an API command.
CREATE POLICY dice_server_only_seats
  ON public."GameToolSeat" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'));

CREATE POLICY dice_server_only_members
  ON public."GameToolRoomMember" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'));

-- Events carry only public actions, but browser clients must not forge them.
-- This shared table had no RLS; preserve prior access to the other games.
CREATE POLICY dice_preserve_other_events
  ON public."GameToolEvent" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'));
CREATE POLICY dice_server_only_events
  ON public."GameToolEvent" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DICE'));
ALTER TABLE public."GameToolEvent" ENABLE ROW LEVEL SECURITY;

COMMIT;
