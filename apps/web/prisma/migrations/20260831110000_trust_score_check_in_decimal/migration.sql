ALTER TABLE "public"."TrustScoreEvent"
ALTER COLUMN "delta" TYPE DOUBLE PRECISION
USING "delta"::DOUBLE PRECISION;

UPDATE "public"."TrustScoreEvent"
SET "delta" = 0.1
WHERE "type" = 'ACTIVITY_CHECK_IN'
  AND "delta" = 1;
