ALTER TABLE "public"."UserProfile"
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "normalizedContactEmail" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "normalizedPhone" TEXT;

CREATE INDEX "UserProfile_normalizedContactEmail_idx" ON "public"."UserProfile"("normalizedContactEmail");
CREATE INDEX "UserProfile_normalizedPhone_idx" ON "public"."UserProfile"("normalizedPhone");
