-- Clerk session JWTs need the `role: authenticated` claim and the Supabase
-- Third-Party Auth integration before clients can join this private channel.
-- Only SELECT is granted: every ink batch is checked and sent by the app server.
CREATE FUNCTION public.draw_guess_can_read_ink_topic()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  topic text := realtime.topic();
  clerk_user_id text := current_setting('request.jwt.claims', true)::jsonb ->> 'sub';
BEGIN
  IF topic IS NULL OR topic !~ '^friemi:draw-guess:[a-z0-9]+:ink:[1-9][0-9]*:[0-9]+$'
     OR length(split_part(topic, ':', 5)) > 9
     OR length(split_part(topic, ':', 6)) > 2
     OR clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public."GameToolRoom" AS room
    JOIN public."GameToolSeat" AS seat ON seat."roomId" = room.id
    JOIN public."GameToolRoomMember" AS member
      ON member."roomId" = room.id AND member."profileId" = seat."profileId"
    JOIN public."UserProfile" AS profile ON profile.id = seat."profileId"
    WHERE room.id = split_part(topic, ':', 3)
      AND room.kind::text = 'DRAW_GUESS'
      AND room.status::text = 'IN_PROGRESS'
      AND room.state ->> 'mode' = 'CLASSIC'
      AND room.state ->> 'phase' = 'DRAW_GUESS'
      AND room.state ->> 'gameNumber' = split_part(topic, ':', 5)
      AND room.state ->> 'turnIndex' = split_part(topic, ':', 6)
      AND room."drawGuessDeadlineAt" > now()
      AND seat."leftAt" IS NULL
      AND member."leftAt" IS NULL
      AND profile."clerkUserId" = clerk_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.draw_guess_can_read_ink_topic() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.draw_guess_can_read_ink_topic() TO authenticated;

CREATE POLICY draw_guess_private_ink_read
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'
  AND public.draw_guess_can_read_ink_topic()
);

-- A restrictive guard keeps an existing broad Realtime SELECT policy from
-- making the ink topic readable to unrelated authenticated users.
CREATE POLICY draw_guess_private_ink_scope
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  realtime.topic() NOT LIKE 'friemi:draw-guess:%:ink:%'
  OR (extension = 'broadcast' AND public.draw_guess_can_read_ink_topic())
);
