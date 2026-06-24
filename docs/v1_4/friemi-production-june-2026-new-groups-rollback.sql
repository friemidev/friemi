-- Friemi manual June 2026 group import ROLLBACK for PRODUCTION database
-- Removes only rows created by:
-- docs/v1_4/friemi-production-june-2026-new-groups-import.sql
--
-- Production checklist before running:
-- 1. Confirm the SQL Editor is connected to the production Supabase project.
-- 2. Create a production database backup/snapshot first.
-- 3. Run this full file at once. If Supabase warns about destructive operations/RLS, choose "Run without RLS".
-- 4. After this returns all remaining counts as 0, run the fixed June import SQL.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."Activity"') IS NULL THEN
    RAISE EXCEPTION 'Activity table does not exist';
  END IF;
  IF to_regclass('public."GuestActivityParticipant"') IS NULL THEN
    RAISE EXCEPTION 'GuestActivityParticipant table does not exist';
  END IF;
END $$;

DELETE FROM "GuestActivityParticipant"
WHERE "sourceUserAgent" = 'manual-group-import:june-2026-wave-1';

DELETE FROM "Activity"
WHERE "source" = 'manual-nextfun-june-2026';

DELETE FROM "UserProfile" u
WHERE u."clerkUserId" LIKE 'manual-production-organizer:%'
  AND NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a."organizerId" = u."id");

SELECT item, count, expected
FROM (
  SELECT
    1 AS sort_order,
    'remaining manual activities' AS item,
    COUNT(*)::bigint AS count,
    '0' AS expected
  FROM "Activity"
  WHERE "source" = 'manual-nextfun-june-2026'
  UNION ALL
  SELECT
    2,
    'remaining manual guest participants',
    COUNT(*)::bigint,
    '0'
  FROM "GuestActivityParticipant"
  WHERE "sourceUserAgent" = 'manual-group-import:june-2026-wave-1'
  UNION ALL
  SELECT
    3,
    'remaining unused manual organizer placeholders',
    COUNT(*)::bigint,
    '0'
  FROM "UserProfile" u
  WHERE u."clerkUserId" LIKE 'manual-production-organizer:%'
    AND NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a."organizerId" = u."id")
) summary
ORDER BY sort_order;

COMMIT;
