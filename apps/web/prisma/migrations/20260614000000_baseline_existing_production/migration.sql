-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ActivityCategory" AS ENUM ('BOARD_GAME', 'MOVIE', 'MUSIC', 'SPORTS', 'TRAVEL', 'FOOD', 'EXHIBITION', 'THEATER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('OPEN', 'FULL', 'DRAFT', 'RECRUITING', 'CONFIRMED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('PUBLIC_EVENT', 'USER_HOSTED', 'LOCAL', 'TRIP');

-- CreateEnum
CREATE TYPE "public"."ActivityVisibility" AS ENUM ('PUBLIC', 'LINK_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."CommentType" AS ENUM ('QUESTION', 'SUGGESTION', 'REVIEW');

-- CreateEnum
CREATE TYPE "public"."FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PARTICIPATION_PENDING', 'PARTICIPATION_CONFIRMED', 'PARTICIPATION_APPROVED', 'PARTICIPATION_REJECTED', 'ACTIVITY_UPDATED', 'ACTIVITY_CANCELLED', 'FRIEND_REQUEST', 'ACTIVITY_COMMENTED', 'COMMENT_REPLY', 'REPORT_CREATED');

-- CreateEnum
CREATE TYPE "public"."ParticipantStatus" AS ENUM ('JOINED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PriceType" AS ENUM ('FREE', 'AA', 'FIXED', 'RANGE');

-- CreateEnum
CREATE TYPE "public"."PublicEventStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'MISLEADING_INFORMATION', 'SAFETY_CONCERN', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."ReportTargetType" AS ENUM ('USER_PROFILE', 'PUBLIC_EVENT', 'ACTIVITY', 'COMMENT');

-- CreateEnum
CREATE TYPE "public"."UserProfileStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itinerary" TEXT,
    "type" "public"."ActivityType" NOT NULL DEFAULT 'LOCAL',
    "category" "public"."ActivityCategory" NOT NULL DEFAULT 'OTHER',
    "city" TEXT NOT NULL DEFAULT 'Paris',
    "destination" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "capacity" INTEGER NOT NULL,
    "minParticipants" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "priceType" "public"."PriceType" NOT NULL DEFAULT 'FREE',
    "priceText" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "externalSource" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "sourcePayload" JSONB,
    "importedAt" TIMESTAMP(3),
    "status" "public"."ActivityStatus" NOT NULL DEFAULT 'RECRUITING',
    "visibility" "public"."ActivityVisibility" NOT NULL DEFAULT 'PUBLIC',
    "organizerId" TEXT NOT NULL,
    "merchantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publicEventId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityFavorite" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityParticipant" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'APPROVED',
    "message" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivitySourceLink" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "userProfileId" TEXT,
    "anonymousId" TEXT,
    "sessionId" TEXT,
    "locale" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "sourceSurface" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "appVersion" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "public"."CommentType" NOT NULL DEFAULT 'QUESTION',
    "content" TEXT NOT NULL,
    "pinnedByOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "parentId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FriendRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "pendingPairKey" TEXT,
    "status" "public"."FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Merchant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Paris',
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "externalSource" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "sourcePayload" JSONB,
    "importedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "activityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."ActivityCategory" NOT NULL DEFAULT 'OTHER',
    "city" TEXT NOT NULL DEFAULT 'Paris',
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "priceType" "public"."PriceType" NOT NULL DEFAULT 'FREE',
    "priceText" TEXT,
    "coverImageUrl" TEXT,
    "officialUrl" TEXT,
    "status" "public"."PublicEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "visibility" "public"."ActivityVisibility" NOT NULL DEFAULT 'PUBLIC',
    "source" TEXT,
    "sourceUrl" TEXT,
    "externalSource" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "sourcePayload" JSONB,
    "importedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicEventFavorite" (
    "id" TEXT NOT NULL,
    "publicEventId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicEventFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "public"."ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "public"."ReportReason" NOT NULL,
    "description" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT,
    "friendCode" CHAR(6),
    "nickname" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "public"."UserProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSignInAt" TIMESTAMP(3),
    "clerkCreatedAt" TIMESTAMP(3),
    "clerkUpdatedAt" TIMESTAMP(3),
    "clerkDeletedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_city_latitude_longitude_idx" ON "public"."Activity"("city" ASC, "latitude" ASC, "longitude" ASC);

-- CreateIndex
CREATE INDEX "Activity_city_startAt_idx" ON "public"."Activity"("city" ASC, "startAt" ASC);

-- CreateIndex
CREATE INDEX "Activity_externalSource_externalId_idx" ON "public"."Activity"("externalSource" ASC, "externalId" ASC);

-- CreateIndex
CREATE INDEX "Activity_externalUrl_idx" ON "public"."Activity"("externalUrl" ASC);

-- CreateIndex
CREATE INDEX "Activity_importedAt_idx" ON "public"."Activity"("importedAt" ASC);

-- CreateIndex
CREATE INDEX "Activity_merchantId_idx" ON "public"."Activity"("merchantId" ASC);

-- CreateIndex
CREATE INDEX "Activity_organizerId_idx" ON "public"."Activity"("organizerId" ASC);

-- CreateIndex
CREATE INDEX "Activity_publicEventId_status_startAt_idx" ON "public"."Activity"("publicEventId" ASC, "status" ASC, "startAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_sourceUrl_key" ON "public"."Activity"("sourceUrl" ASC);

-- CreateIndex
CREATE INDEX "Activity_source_idx" ON "public"."Activity"("source" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityFavorite_activityId_userProfileId_key" ON "public"."ActivityFavorite"("activityId" ASC, "userProfileId" ASC);

-- CreateIndex
CREATE INDEX "ActivityFavorite_userProfileId_createdAt_idx" ON "public"."ActivityFavorite"("userProfileId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityParticipant_activityId_userProfileId_key" ON "public"."ActivityParticipant"("activityId" ASC, "userProfileId" ASC);

-- CreateIndex
CREATE INDEX "ActivityParticipant_userProfileId_idx" ON "public"."ActivityParticipant"("userProfileId" ASC);

-- CreateIndex
CREATE INDEX "ActivitySourceLink_activityId_idx" ON "public"."ActivitySourceLink"("activityId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySourceLink_sourceUrl_key" ON "public"."ActivitySourceLink"("sourceUrl" ASC);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_entityType_entityId_createdAt_idx" ON "public"."AnalyticsEvent"("entityType" ASC, "entityId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_environment_createdAt_idx" ON "public"."AnalyticsEvent"("environment" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "public"."AnalyticsEvent"("name" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sourceSurface_createdAt_idx" ON "public"."AnalyticsEvent"("sourceSurface" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userProfileId_createdAt_idx" ON "public"."AnalyticsEvent"("userProfileId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Comment_activityId_parentId_createdAt_idx" ON "public"."Comment"("activityId" ASC, "parentId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Comment_activityId_pinnedByOrganizer_createdAt_idx" ON "public"."Comment"("activityId" ASC, "pinnedByOrganizer" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "public"."Comment"("authorId" ASC);

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "public"."Comment"("parentId" ASC);

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "public"."Conversation"("lastMessageAt" ASC);

-- CreateIndex
CREATE INDEX "Conversation_userAId_lastMessageAt_idx" ON "public"."Conversation"("userAId" ASC, "lastMessageAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_userAId_userBId_key" ON "public"."Conversation"("userAId" ASC, "userBId" ASC);

-- CreateIndex
CREATE INDEX "Conversation_userBId_lastMessageAt_idx" ON "public"."Conversation"("userBId" ASC, "lastMessageAt" ASC);

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "public"."DirectMessage"("conversationId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_createdAt_idx" ON "public"."DirectMessage"("senderId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_pendingPairKey_key" ON "public"."FriendRequest"("pendingPairKey" ASC);

-- CreateIndex
CREATE INDEX "FriendRequest_receiverId_status_createdAt_idx" ON "public"."FriendRequest"("receiverId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FriendRequest_requesterId_receiverId_status_idx" ON "public"."FriendRequest"("requesterId" ASC, "receiverId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "FriendRequest_requesterId_status_createdAt_idx" ON "public"."FriendRequest"("requesterId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "public"."Friendship"("userAId" ASC, "userBId" ASC);

-- CreateIndex
CREATE INDEX "Friendship_userBId_idx" ON "public"."Friendship"("userBId" ASC);

-- CreateIndex
CREATE INDEX "Merchant_externalSource_externalId_idx" ON "public"."Merchant"("externalSource" ASC, "externalId" ASC);

-- CreateIndex
CREATE INDEX "Merchant_externalUrl_idx" ON "public"."Merchant"("externalUrl" ASC);

-- CreateIndex
CREATE INDEX "Merchant_importedAt_idx" ON "public"."Merchant"("importedAt" ASC);

-- CreateIndex
CREATE INDEX "Merchant_isActive_city_idx" ON "public"."Merchant"("isActive" ASC, "city" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "public"."Merchant"("slug" ASC);

-- CreateIndex
CREATE INDEX "Notification_activityId_idx" ON "public"."Notification"("activityId" ASC);

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "public"."Notification"("recipientId" ASC, "readAt" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "PublicEvent_city_startAt_idx" ON "public"."PublicEvent"("city" ASC, "startAt" ASC);

-- CreateIndex
CREATE INDEX "PublicEvent_externalSource_externalId_idx" ON "public"."PublicEvent"("externalSource" ASC, "externalId" ASC);

-- CreateIndex
CREATE INDEX "PublicEvent_externalUrl_idx" ON "public"."PublicEvent"("externalUrl" ASC);

-- CreateIndex
CREATE INDEX "PublicEvent_importedAt_idx" ON "public"."PublicEvent"("importedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PublicEvent_sourceUrl_key" ON "public"."PublicEvent"("sourceUrl" ASC);

-- CreateIndex
CREATE INDEX "PublicEvent_status_startAt_idx" ON "public"."PublicEvent"("status" ASC, "startAt" ASC);

-- CreateIndex
CREATE INDEX "PublicEvent_visibility_startAt_idx" ON "public"."PublicEvent"("visibility" ASC, "startAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PublicEventFavorite_publicEventId_userProfileId_key" ON "public"."PublicEventFavorite"("publicEventId" ASC, "userProfileId" ASC);

-- CreateIndex
CREATE INDEX "PublicEventFavorite_userProfileId_createdAt_idx" ON "public"."PublicEventFavorite"("userProfileId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Report_reporterId_createdAt_idx" ON "public"."Report"("reporterId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_targetType_targetId_key" ON "public"."Report"("reporterId" ASC, "targetType" ASC, "targetId" ASC);

-- CreateIndex
CREATE INDEX "Report_reviewerId_idx" ON "public"."Report"("reviewerId" ASC);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "public"."Report"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "public"."Report"("targetType" ASC, "targetId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "public"."UserFollow"("followerId" ASC, "followingId" ASC);

-- CreateIndex
CREATE INDEX "UserFollow_followingId_idx" ON "public"."UserFollow"("followingId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "public"."UserProfile"("clerkUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_friendCode_key" ON "public"."UserProfile"("friendCode" ASC);

-- CreateIndex
CREATE INDEX "UserProfile_nickname_idx" ON "public"."UserProfile"("nickname" ASC);

-- CreateIndex
CREATE INDEX "UserProfile_role_status_idx" ON "public"."UserProfile"("role" ASC, "status" ASC);

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_publicEventId_fkey" FOREIGN KEY ("publicEventId") REFERENCES "public"."PublicEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityFavorite" ADD CONSTRAINT "ActivityFavorite_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityFavorite" ADD CONSTRAINT "ActivityFavorite_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivitySourceLink" ADD CONSTRAINT "ActivitySourceLink_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendRequest" ADD CONSTRAINT "FriendRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicEventFavorite" ADD CONSTRAINT "PublicEventFavorite_publicEventId_fkey" FOREIGN KEY ("publicEventId") REFERENCES "public"."PublicEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicEventFavorite" ADD CONSTRAINT "PublicEventFavorite_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

