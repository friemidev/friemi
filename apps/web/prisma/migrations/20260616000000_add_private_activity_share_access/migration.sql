ALTER TABLE "public"."Activity"
ADD COLUMN "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "Activity_shareToken_key"
ON "public"."Activity"("shareToken");
