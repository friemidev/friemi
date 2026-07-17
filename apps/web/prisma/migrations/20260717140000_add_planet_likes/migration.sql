CREATE TABLE "public"."PlanetMomentLike" (
  "id" TEXT NOT NULL,
  "momentId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanetMomentLike_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."PlanetMomentCommentLike" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanetMomentCommentLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanetMomentLike_momentId_profileId_key" ON "public"."PlanetMomentLike"("momentId", "profileId");
CREATE UNIQUE INDEX "PlanetMomentCommentLike_commentId_profileId_key" ON "public"."PlanetMomentCommentLike"("commentId", "profileId");
CREATE INDEX "PlanetMomentLike_profileId_createdAt_idx" ON "public"."PlanetMomentLike"("profileId", "createdAt");
CREATE INDEX "PlanetMomentCommentLike_profileId_createdAt_idx" ON "public"."PlanetMomentCommentLike"("profileId", "createdAt");
ALTER TABLE "public"."PlanetMomentLike" ADD CONSTRAINT "PlanetMomentLike_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "public"."PlanetMoment"("id") ON DELETE CASCADE;
ALTER TABLE "public"."PlanetMomentLike" ADD CONSTRAINT "PlanetMomentLike_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE;
ALTER TABLE "public"."PlanetMomentCommentLike" ADD CONSTRAINT "PlanetMomentCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."PlanetMomentComment"("id") ON DELETE CASCADE;
ALTER TABLE "public"."PlanetMomentCommentLike" ADD CONSTRAINT "PlanetMomentCommentLike_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE;
