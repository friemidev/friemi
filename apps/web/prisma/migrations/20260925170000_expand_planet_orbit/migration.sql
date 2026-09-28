ALTER TABLE "Planet"
ADD COLUMN IF NOT EXISTS "announcement" TEXT;

ALTER TABLE "PlanetMoment"
ADD COLUMN IF NOT EXISTS "videoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Moment"
ADD COLUMN IF NOT EXISTS "activityId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Moment_activityId_fkey'
  ) THEN
    ALTER TABLE "Moment"
    ADD CONSTRAINT "Moment_activityId_fkey"
      FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Moment_activityId_createdAt_idx"
ON "Moment"("activityId", "createdAt");

CREATE TABLE IF NOT EXISTS "PlanetActivity" (
  "planetId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanetActivity_pkey" PRIMARY KEY ("planetId", "activityId"),
  CONSTRAINT "PlanetActivity_planetId_fkey"
    FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanetActivity_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlanetActivity_activityId_addedAt_idx"
ON "PlanetActivity"("activityId", "addedAt");

CREATE INDEX IF NOT EXISTS "PlanetActivity_planetId_addedAt_idx"
ON "PlanetActivity"("planetId", "addedAt");
