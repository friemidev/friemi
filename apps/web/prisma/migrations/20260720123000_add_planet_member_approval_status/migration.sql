CREATE TYPE "public"."PlanetMembershipStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TABLE "public"."PlanetMember"
ADD COLUMN "status" "public"."PlanetMembershipStatus" NOT NULL DEFAULT 'APPROVED';

CREATE INDEX "PlanetMember_planetId_status_joinedAt_idx"
ON "public"."PlanetMember"("planetId", "status", "joinedAt");
