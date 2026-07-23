ALTER TABLE "public"."Planet" ADD COLUMN "inviteCode" TEXT;

UPDATE "public"."Planet"
SET "inviteCode" = upper(substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 10));

ALTER TABLE "public"."Planet" ALTER COLUMN "inviteCode" SET NOT NULL;
ALTER TABLE "public"."Planet" ALTER COLUMN "inviteCode" SET DATA TYPE VARCHAR(16);
CREATE UNIQUE INDEX "Planet_inviteCode_key" ON "public"."Planet"("inviteCode");
