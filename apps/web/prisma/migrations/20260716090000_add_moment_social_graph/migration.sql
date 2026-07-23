ALTER TYPE "public"."NotificationType" ADD VALUE 'MOMENT_LIKED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'MOMENT_COMMENTED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'MOMENT_COMMENT_REPLY';
ALTER TYPE "public"."NotificationType" ADD VALUE 'MOMENT_REPOSTED';

ALTER TYPE "public"."ReportTargetType" ADD VALUE 'MOMENT';
ALTER TYPE "public"."ReportTargetType" ADD VALUE 'MOMENT_COMMENT';

CREATE TYPE "public"."MomentVisibility" AS ENUM ('FRIENDS', 'PUBLIC');

CREATE TABLE "public"."Moment" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT,
    "visibility" "public"."MomentVisibility" NOT NULL DEFAULT 'FRIENDS',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "repostCount" INTEGER NOT NULL DEFAULT 0,
    "resharedMomentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MomentImage" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MomentLike" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MomentComment" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomentComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Notification"
ADD COLUMN "momentId" TEXT,
ADD COLUMN "momentCommentId" TEXT;

CREATE INDEX "Moment_authorId_createdAt_idx"
ON "public"."Moment"("authorId", "createdAt");

CREATE INDEX "Moment_visibility_createdAt_idx"
ON "public"."Moment"("visibility", "createdAt");

CREATE INDEX "Moment_deletedAt_createdAt_idx"
ON "public"."Moment"("deletedAt", "createdAt");

CREATE INDEX "Moment_resharedMomentId_createdAt_idx"
ON "public"."Moment"("resharedMomentId", "createdAt");

CREATE INDEX "MomentImage_momentId_sortOrder_idx"
ON "public"."MomentImage"("momentId", "sortOrder");

CREATE UNIQUE INDEX "MomentLike_momentId_userId_key"
ON "public"."MomentLike"("momentId", "userId");

CREATE INDEX "MomentLike_userId_createdAt_idx"
ON "public"."MomentLike"("userId", "createdAt");

CREATE INDEX "MomentLike_momentId_createdAt_idx"
ON "public"."MomentLike"("momentId", "createdAt");

CREATE INDEX "MomentComment_momentId_parentId_createdAt_idx"
ON "public"."MomentComment"("momentId", "parentId", "createdAt");

CREATE INDEX "MomentComment_authorId_createdAt_idx"
ON "public"."MomentComment"("authorId", "createdAt");

CREATE INDEX "MomentComment_parentId_idx"
ON "public"."MomentComment"("parentId");

CREATE INDEX "Notification_momentId_idx"
ON "public"."Notification"("momentId");

CREATE INDEX "Notification_momentCommentId_idx"
ON "public"."Notification"("momentCommentId");

ALTER TABLE "public"."Moment"
ADD CONSTRAINT "Moment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Moment"
ADD CONSTRAINT "Moment_resharedMomentId_fkey"
FOREIGN KEY ("resharedMomentId") REFERENCES "public"."Moment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."MomentImage"
ADD CONSTRAINT "MomentImage_momentId_fkey"
FOREIGN KEY ("momentId") REFERENCES "public"."Moment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MomentLike"
ADD CONSTRAINT "MomentLike_momentId_fkey"
FOREIGN KEY ("momentId") REFERENCES "public"."Moment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MomentLike"
ADD CONSTRAINT "MomentLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MomentComment"
ADD CONSTRAINT "MomentComment_momentId_fkey"
FOREIGN KEY ("momentId") REFERENCES "public"."Moment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MomentComment"
ADD CONSTRAINT "MomentComment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MomentComment"
ADD CONSTRAINT "MomentComment_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "public"."MomentComment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Notification"
ADD CONSTRAINT "Notification_momentId_fkey"
FOREIGN KEY ("momentId") REFERENCES "public"."Moment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Notification"
ADD CONSTRAINT "Notification_momentCommentId_fkey"
FOREIGN KEY ("momentCommentId") REFERENCES "public"."MomentComment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
