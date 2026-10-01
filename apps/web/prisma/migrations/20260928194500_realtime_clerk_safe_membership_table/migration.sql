-- The existing Realtime policy reads this table as the JWT role, so its own
-- RLS check also needs to accept Clerk's non-UUID `sub` without casting it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_realtime_memberships'
      AND policyname = 'game_realtime_memberships_users_read_own'
  ) THEN
    EXECUTE $policy$
      ALTER POLICY game_realtime_memberships_users_read_own
      ON public.game_realtime_memberships
      USING (user_id::text = (auth.jwt() ->> 'sub'))
    $policy$;
  END IF;
END;
$$;
