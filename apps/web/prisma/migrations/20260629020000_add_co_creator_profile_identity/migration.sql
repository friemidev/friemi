ALTER TABLE "public"."UserProfile"
ADD COLUMN "isCoCreator" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "UserProfile_isCoCreator_status_idx" ON "public"."UserProfile"("isCoCreator", "status");
