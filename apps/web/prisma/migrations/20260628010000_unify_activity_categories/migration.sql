-- Unify activity and team-plan categories around the mobile hall 9+1 taxonomy.
-- Historical movie/theater entries move into AUDIO_VISUAL; exhibitions move into ART.
-- Existing OTHER rows stay as OTHER to avoid unsafe title-based backfills.

CREATE TYPE "public"."ActivityCategory_new" AS ENUM (
    'FOOD',
    'WANDER',
    'AUDIO_VISUAL',
    'ART',
    'BOARD_GAME',
    'GROWTH',
    'TRAVEL',
    'MUSIC',
    'SPORTS',
    'OTHER'
);

ALTER TABLE "public"."Activity" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "public"."PublicEvent" ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "public"."Activity"
  ALTER COLUMN "category" TYPE "public"."ActivityCategory_new"
  USING (
    CASE "category"::text
      WHEN 'MOVIE' THEN 'AUDIO_VISUAL'
      WHEN 'THEATER' THEN 'AUDIO_VISUAL'
      WHEN 'EXHIBITION' THEN 'ART'
      ELSE "category"::text
    END
  )::"public"."ActivityCategory_new";

ALTER TABLE "public"."PublicEvent"
  ALTER COLUMN "category" TYPE "public"."ActivityCategory_new"
  USING (
    CASE "category"::text
      WHEN 'MOVIE' THEN 'AUDIO_VISUAL'
      WHEN 'THEATER' THEN 'AUDIO_VISUAL'
      WHEN 'EXHIBITION' THEN 'ART'
      ELSE "category"::text
    END
  )::"public"."ActivityCategory_new";

ALTER TABLE "public"."Activity"
  ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."ActivityCategory_new";
ALTER TABLE "public"."PublicEvent"
  ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."ActivityCategory_new";

DROP TYPE "public"."ActivityCategory";
ALTER TYPE "public"."ActivityCategory_new" RENAME TO "ActivityCategory";
