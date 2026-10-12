BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- UNO command receipts and round history are only read/written by the app's
-- direct Prisma connection. Browser clients use authenticated application APIs.
-- Keep these tables closed even when Supabase default privileges grant access
-- to new public tables, or when the project's Data API is enabled later.
ALTER TABLE public."UnoCommand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UnoRound" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."UnoCommand", public."UnoRound" FROM PUBLIC;

-- The roles exist in Supabase but are optional in plain PostgreSQL test DBs.
DO $$
DECLARE
  browser_role text;
BEGIN
  FOR browser_role IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public."UnoCommand", public."UnoRound" FROM %I',
      browser_role
    );
  END LOOP;
END;
$$;

-- No browser policies: only the table owner/BYPASSRLS server connection can
-- access these records. Do not FORCE RLS on the application server's owner.

-- Full hands and the shuffled draw pile live in GameToolRoom.state. Close UNO
-- rows to direct browser roles, even if Data API is enabled and another
-- permissive policy is later added. Retain the previous access to other games
-- only on installations where this shared table did not already enforce RLS.
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."GameToolRoom"'::regclass) THEN
    CREATE POLICY uno_preserve_existing_other_games
      ON public."GameToolRoom" AS PERMISSIVE FOR ALL TO PUBLIC
      USING (kind::text <> 'UNO') WITH CHECK (kind::text <> 'UNO');
  END IF;
END;
$$;

CREATE POLICY uno_server_only_room
  ON public."GameToolRoom" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (kind::text <> 'UNO') WITH CHECK (kind::text <> 'UNO');

ALTER TABLE public."GameToolRoom" ENABLE ROW LEVEL SECURITY;

-- A browser must not rewrite UNO seats/members and then impersonate them through
-- the normal application API. EXISTS deliberately requires a visible non-UNO
-- parent; a UNO parent hidden by its own RLS therefore remains denied.
DO $$
DECLARE
  target_table text;
  previously_secured boolean;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['GameToolSeat', 'GameToolRoomMember']
  LOOP
    SELECT relrowsecurity INTO previously_secured FROM pg_class
      WHERE oid = format('public.%I', target_table)::regclass;
    IF NOT previously_secured THEN
      EXECUTE format(
        'CREATE POLICY uno_preserve_existing_other_game_members ON public.%I '
        'AS PERMISSIVE FOR ALL TO PUBLIC '
        'USING (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> ''UNO'')) '
        'WITH CHECK (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> ''UNO''))',
        target_table
      );
    END IF;
    EXECUTE format(
      'CREATE POLICY uno_server_only_members ON public.%I '
      'AS RESTRICTIVE FOR ALL TO PUBLIC '
      'USING (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> ''UNO'')) '
      'WITH CHECK (EXISTS (SELECT 1 FROM public."GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> ''UNO''))',
      target_table
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
  END LOOP;
END;
$$;

COMMIT;
