CREATE TYPE "public"."PlanetVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "public"."PlanetMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE "public"."Planet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "public"."PlanetVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PlanetMember" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" "public"."PlanetMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanetMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PlanetMessage" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanetMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PlanetMoment" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanetMoment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PlanetMomentComment" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanetMomentComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Planet_slug_key" ON "public"."Planet"("slug");
CREATE INDEX "Planet_visibility_createdAt_idx" ON "public"."Planet"("visibility", "createdAt");
CREATE INDEX "Planet_ownerId_createdAt_idx" ON "public"."Planet"("ownerId", "createdAt");
CREATE UNIQUE INDEX "PlanetMember_planetId_profileId_key" ON "public"."PlanetMember"("planetId", "profileId");
CREATE INDEX "PlanetMember_profileId_joinedAt_idx" ON "public"."PlanetMember"("profileId", "joinedAt");
CREATE INDEX "PlanetMessage_planetId_createdAt_idx" ON "public"."PlanetMessage"("planetId", "createdAt");
CREATE INDEX "PlanetMessage_authorId_createdAt_idx" ON "public"."PlanetMessage"("authorId", "createdAt");
CREATE INDEX "PlanetMoment_planetId_createdAt_idx" ON "public"."PlanetMoment"("planetId", "createdAt");
CREATE INDEX "PlanetMoment_authorId_createdAt_idx" ON "public"."PlanetMoment"("authorId", "createdAt");
CREATE INDEX "PlanetMomentComment_momentId_createdAt_idx" ON "public"."PlanetMomentComment"("momentId", "createdAt");
CREATE INDEX "PlanetMomentComment_authorId_createdAt_idx" ON "public"."PlanetMomentComment"("authorId", "createdAt");

ALTER TABLE "public"."Planet" ADD CONSTRAINT "Planet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMember" ADD CONSTRAINT "PlanetMember_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "public"."Planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMember" ADD CONSTRAINT "PlanetMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMessage" ADD CONSTRAINT "PlanetMessage_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "public"."Planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMessage" ADD CONSTRAINT "PlanetMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMoment" ADD CONSTRAINT "PlanetMoment_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "public"."Planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMoment" ADD CONSTRAINT "PlanetMoment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMomentComment" ADD CONSTRAINT "PlanetMomentComment_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "public"."PlanetMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PlanetMomentComment" ADD CONSTRAINT "PlanetMomentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
