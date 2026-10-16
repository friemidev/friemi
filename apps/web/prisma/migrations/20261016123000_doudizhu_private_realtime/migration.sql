-- Clerk session JWTs require Supabase Third-Party Auth and role=authenticated.
-- Plain PostgreSQL has no realtime schema, so local standalone deployments skip
-- channel policies and use the authenticated application snapshot polling path.
DO $migration$
BEGIN
  IF to_regclass('realtime.messages') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE $function$
    CREATE FUNCTION public.ddz_can_receive_room()
    RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
    AS $body$
    DECLARE
      topic text := realtime.topic();
      actor_sub text;
    BEGIN
      BEGIN
        actor_sub := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
      EXCEPTION WHEN invalid_text_representation THEN
        RETURN false;
      END;
      IF topic IS NULL OR topic !~ '^friemi:doudizhu:[a-z0-9]+$' OR actor_sub IS NULL THEN
        RETURN false;
      END IF;
      RETURN EXISTS (
        SELECT 1 FROM public."GameToolRoom" r
        JOIN public."GameToolSeat" s ON s."roomId" = r.id
        JOIN public."GameToolRoomMember" m ON m."roomId" = r.id AND m."seatedSeatId" = s.id AND m."profileId" = s."profileId"
        JOIN public."UserProfile" p ON p.id = s."profileId"
        WHERE r.id = split_part(topic, ':', 3) AND r.kind::text = 'DOUDIZHU'
          AND r.status::text IN ('LOBBY', 'IN_PROGRESS', 'FINISHED')
          AND s."leftAt" IS NULL AND m."leftAt" IS NULL
          AND p.status::text = 'ACTIVE' AND p."clerkUserId" = actor_sub
      );
    END;
    $body$
  $function$;
  EXECUTE 'REVOKE ALL ON FUNCTION public.ddz_can_receive_room() FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.ddz_can_receive_room() TO authenticated';
  EXECUTE 'GRANT SELECT ON realtime.messages TO authenticated';
  EXECUTE $policy$
    CREATE POLICY ddz_private_room_read ON realtime.messages FOR SELECT TO authenticated
      USING (extension = 'broadcast' AND public.ddz_can_receive_room())
  $policy$;
  -- An unrelated permissive policy must not grant nonmember subscriptions.
  EXECUTE $policy$
    CREATE POLICY ddz_private_room_scope ON realtime.messages AS RESTRICTIVE FOR SELECT TO PUBLIC
      USING (realtime.topic() NOT LIKE 'friemi:doudizhu:%' OR (extension = 'broadcast' AND public.ddz_can_receive_room()))
  $policy$;
  -- Only the server service role publishes accepted state invalidations.
  EXECUTE $policy$
    CREATE POLICY ddz_no_client_broadcast_insert ON realtime.messages AS RESTRICTIVE FOR INSERT TO PUBLIC
      WITH CHECK (realtime.topic() NOT LIKE 'friemi:doudizhu:%')
  $policy$;
  EXECUTE $policy$
    CREATE POLICY ddz_no_client_broadcast_update ON realtime.messages AS RESTRICTIVE FOR UPDATE TO PUBLIC
      USING (realtime.topic() NOT LIKE 'friemi:doudizhu:%') WITH CHECK (realtime.topic() NOT LIKE 'friemi:doudizhu:%')
  $policy$;
  EXECUTE $policy$
    CREATE POLICY ddz_no_client_broadcast_delete ON realtime.messages AS RESTRICTIVE FOR DELETE TO PUBLIC
      USING (realtime.topic() NOT LIKE 'friemi:doudizhu:%')
  $policy$;
END;
$migration$;
