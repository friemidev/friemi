-- A private-channel member can subscribe, but all drawing batches must pass
-- through the app server's current-artist and current-turn validation.
CREATE POLICY draw_guess_private_ink_server_write
ON realtime.messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() NOT LIKE 'friemi:draw-guess:%:ink:%');
