CREATE TYPE "public"."ActivityPriorityTargetType" AS ENUM ('ACTIVITY', 'PUBLIC_EVENT');

CREATE TABLE "public"."ActivityPriorityOverride" (
  "id" TEXT NOT NULL,
  "targetType" "public"."ActivityPriorityTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "initialBoost" INTEGER NOT NULL DEFAULT 0,
  "boostStartedAt" TIMESTAMP(3) NOT NULL,
  "boostExpiresAt" TIMESTAMP(3),
  "note" VARCHAR(240),
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityPriorityOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ActivityPriorityOverrideLog" (
  "id" TEXT NOT NULL,
  "targetType" "public"."ActivityPriorityTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "oldBoost" INTEGER NOT NULL DEFAULT 0,
  "newBoost" INTEGER NOT NULL DEFAULT 0,
  "note" VARCHAR(240),
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityPriorityOverrideLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityPriorityOverride_targetType_targetId_key" ON "public"."ActivityPriorityOverride"("targetType", "targetId");
CREATE INDEX "ActivityPriorityOverride_targetType_boostExpiresAt_idx" ON "public"."ActivityPriorityOverride"("targetType", "boostExpiresAt");
CREATE INDEX "ActivityPriorityOverride_targetType_updatedAt_idx" ON "public"."ActivityPriorityOverride"("targetType", "updatedAt");
CREATE INDEX "ActivityPriorityOverride_updatedById_updatedAt_idx" ON "public"."ActivityPriorityOverride"("updatedById", "updatedAt");
CREATE INDEX "ActivityPriorityOverrideLog_targetType_targetId_createdAt_idx" ON "public"."ActivityPriorityOverrideLog"("targetType", "targetId", "createdAt");
CREATE INDEX "ActivityPriorityOverrideLog_actorId_createdAt_idx" ON "public"."ActivityPriorityOverrideLog"("actorId", "createdAt");

ALTER TABLE "public"."ActivityPriorityOverride"
  ADD CONSTRAINT "ActivityPriorityOverride_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPriorityOverrideLog"
  ADD CONSTRAINT "ActivityPriorityOverrideLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
