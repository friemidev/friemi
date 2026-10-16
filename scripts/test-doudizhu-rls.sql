-- Local-only integration check. Everything, including the Realtime stub and role,
-- is rolled back. Never run against Supabase or a database with production data.
-- psql -h 127.0.0.1 -p 55436 -U ubuntu23 -d friemi_ddz_migration -f scripts/test-doudizhu-rls.sql
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'friemi_ddz_migration' OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet THEN
    RAISE EXCEPTION 'This test requires the isolated local friemi_ddz_migration database';
  END IF;
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to replace an existing Realtime installation';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA realtime;
CREATE TABLE realtime.messages (id integer PRIMARY KEY, extension text NOT NULL, payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic', true) $$;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT ALL ON realtime.messages TO authenticated;
-- Deliberately permissive existing policies must not bypass the DDZ boundary.
CREATE POLICY existing_open_read ON realtime.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY existing_open_insert ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY existing_open_update ON realtime.messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY existing_open_delete ON realtime.messages FOR DELETE TO authenticated USING (true);
INSERT INTO realtime.messages VALUES (1, 'broadcast', '{"roomId":"ddzrlstest123","revision":7}');
\ir ../apps/web/prisma/migrations/20261016123000_doudizhu_private_realtime/migration.sql

INSERT INTO "UserProfile" (id, "clerkUserId", nickname, "updatedAt") VALUES
  ('ddzrlsprofile1', 'user_ddz_rls_member', 'RLS member', now()),
  ('ddzrlsprofile2', 'user_ddz_rls_outsider', 'RLS outsider', now());
INSERT INTO "GameToolRoom" (id, kind, code, title, "hostId", "updatedAt") VALUES
  ('ddzrlstest123', 'DOUDIZHU', 'RLS123', 'RLS test', 'ddzrlsprofile1', now());
INSERT INTO "GameToolSeat" (id, "roomId", "profileId", "privateToken", "seatNumber", "displayName") VALUES
  ('ddzrlsseat1', 'ddzrlstest123', 'ddzrlsprofile1', 'ddzrlsprivatetoken1', 0, 'RLS member');
INSERT INTO "GameToolRoomMember" (id, "roomId", "profileId", "seatedSeatId", "memberToken", "updatedAt") VALUES
  ('ddzrlsmember1', 'ddzrlstest123', 'ddzrlsprofile1', 'ddzrlsseat1', 'ddzrlsmembertoken1', now());
CREATE TEMP TABLE ddz_rls_results (label text, passed boolean, detail text);
GRANT INSERT, SELECT ON ddz_rls_results TO authenticated;
CREATE FUNCTION pg_temp.ddz_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  INSERT INTO ddz_rls_results VALUES (label, coalesce(ok, false), NULL);
END $$;
CREATE FUNCTION pg_temp.ddz_reject_bad_claims(claims text, label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE count_seen integer;
BEGIN
  PERFORM set_config('request.jwt.claims', claims, true);
  BEGIN
    SELECT count(*) INTO count_seen FROM realtime.messages;
    PERFORM pg_temp.ddz_assert(count_seen = 0, label);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO ddz_rls_results VALUES (label, false, SQLSTATE || ': ' || SQLERRM);
  END;
END $$;
SET LOCAL realtime.topic = 'friemi:doudizhu:ddzrlstest123';
SET LOCAL ROLE authenticated;
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Missing claims deny cleanly');
SET LOCAL request.jwt.claims = '{"sub":"user_ddz_rls_member","role":"authenticated"}';
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 1, 'Active seated member receives broadcast');
SET LOCAL request.jwt.claims = '{"sub":"user_ddz_rls_outsider","role":"authenticated"}';
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Outsider denied despite existing permissive read');
SET LOCAL request.jwt.claims = '{"sub":"user_ddz_rls_member","role":"authenticated"}';
DO $$ BEGIN
  BEGIN
    INSERT INTO realtime.messages VALUES (2, 'broadcast', '{}');
    PERFORM pg_temp.ddz_assert(false, 'Client broadcast insert denied');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ddz_assert(true, 'Client broadcast insert denied');
  END;
END $$;
WITH changed AS (UPDATE realtime.messages SET payload = '{}' WHERE id = 1 RETURNING *)
SELECT pg_temp.ddz_assert((SELECT count(*) FROM changed) = 0, 'Client broadcast update denied');
WITH changed AS (DELETE FROM realtime.messages WHERE id = 1 RETURNING *)
SELECT pg_temp.ddz_assert((SELECT count(*) FROM changed) = 0, 'Client broadcast delete denied');
RESET ROLE;
UPDATE "GameToolRoomMember" SET "leftAt" = now() WHERE id = 'ddzrlsmember1';
SET LOCAL ROLE authenticated;
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Departed member denied');
RESET ROLE;
UPDATE "GameToolRoomMember" SET "leftAt" = NULL WHERE id = 'ddzrlsmember1';
UPDATE "GameToolSeat" SET "leftAt" = now() WHERE id = 'ddzrlsseat1';
SET LOCAL ROLE authenticated;
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Departed seat denied');
RESET ROLE;
UPDATE "GameToolSeat" SET "leftAt" = NULL WHERE id = 'ddzrlsseat1';
UPDATE "GameToolRoom" SET status = 'CANCELLED' WHERE id = 'ddzrlstest123';
SET LOCAL ROLE authenticated;
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Closed room denied');
RESET ROLE;
UPDATE "GameToolRoom" SET status = 'LOBBY' WHERE id = 'ddzrlstest123';
UPDATE "UserProfile" SET status = 'DELETED' WHERE id = 'ddzrlsprofile1';
SET LOCAL ROLE authenticated;
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Inactive profile denied');
RESET ROLE;
UPDATE "UserProfile" SET status = 'ACTIVE' WHERE id = 'ddzrlsprofile1';
UPDATE realtime.messages SET extension = 'presence' WHERE id = 1;
SET LOCAL ROLE authenticated;
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 0, 'Nonbroadcast DDZ message denied');
RESET ROLE;
UPDATE realtime.messages SET extension = 'broadcast' WHERE id = 1;
SET LOCAL ROLE authenticated;
SET LOCAL realtime.topic = 'other-game:room123';
SET LOCAL request.jwt.claims = '{"sub":"user_ddz_rls_outsider","role":"authenticated"}';
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages) = 1, 'Other-topic existing read policy preserved');
INSERT INTO realtime.messages VALUES (3, 'broadcast', '{}');
SELECT pg_temp.ddz_assert((SELECT count(*) FROM realtime.messages WHERE id = 3) = 1, 'Other-topic existing insert policy preserved');
DELETE FROM realtime.messages WHERE id = 3;
SET LOCAL realtime.topic = 'friemi:doudizhu:ddzrlstest123';
SELECT pg_temp.ddz_reject_bad_claims('null', 'JSON null claims deny cleanly');
SELECT pg_temp.ddz_reject_bad_claims('{}', 'Claims without sub deny cleanly');
SELECT pg_temp.ddz_reject_bad_claims('', 'Empty claims deny cleanly');
SELECT pg_temp.ddz_reject_bad_claims('broken-json', 'Malformed claims deny cleanly');
RESET ROLE;
TABLE ddz_rls_results;
DO $$ BEGIN
  IF EXISTS (SELECT FROM ddz_rls_results WHERE NOT passed) THEN RAISE EXCEPTION 'DDZ RLS checks failed (see rows above)'; END IF;
END $$;
ROLLBACK;
