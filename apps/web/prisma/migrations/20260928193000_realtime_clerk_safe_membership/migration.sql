-- Native Supabase user IDs are UUIDs, while Clerk IDs are strings such as
-- user_123. auth.uid() casts every JWT sub to UUID and raises an exception
-- for Clerk, even if another permissive SELECT policy grants the ink topic.
-- Text equality preserves the native UUID membership check without casting
-- third-party JWT subjects.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'game_members_can_receive_realtime'
  ) THEN
    EXECUTE $policy$
      ALTER POLICY game_members_can_receive_realtime
      ON realtime.messages
      USING (
        EXISTS (
          SELECT 1 FROM public.game_realtime_memberships AS membership
          WHERE membership.user_id::text = (auth.jwt() ->> 'sub')
            AND membership.topic = realtime.topic()
            AND membership.can_receive_broadcast
            AND (membership.expires_at IS NULL OR membership.expires_at > statement_timestamp())
            AND realtime.messages.extension IN ('broadcast', 'presence')
        )
      )
    $policy$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'game_members_can_publish_presence'
  ) THEN
    EXECUTE $policy$
      ALTER POLICY game_members_can_publish_presence
      ON realtime.messages
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.game_realtime_memberships AS membership
          WHERE membership.user_id::text = (auth.jwt() ->> 'sub')
            AND membership.topic = realtime.topic()
            AND membership.can_publish_presence
            AND (membership.expires_at IS NULL OR membership.expires_at > statement_timestamp())
            AND realtime.messages.extension = 'presence'
        )
      )
    $policy$;
  END IF;
END;
$$;
