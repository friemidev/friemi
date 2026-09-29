CREATE TYPE "public"."ActivityPollKind" AS ENUM (
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE'
);

CREATE TYPE "public"."ActivityPollStatus" AS ENUM (
  'DRAFT',
  'OPEN',
  'CLOSED',
  'CANCELLED',
  'ARCHIVED'
);

CREATE TYPE "public"."ActivityPollAudience" AS ENUM (
  'MEMBERS_ONLY',
  'SIGNED_IN_WITH_LINK',
  'ANYONE_WITH_LINK'
);

CREATE TYPE "public"."ActivityPollGuestIdentityMode" AS ENUM (
  'NICKNAME_REQUIRED',
  'NICKNAME_OPTIONAL_ANONYMOUS'
);

CREATE TYPE "public"."ActivityPollResultVisibility" AS ENUM (
  'AFTER_VOTE',
  'AFTER_CLOSE',
  'ALWAYS',
  'ORGANIZER_ONLY'
);

CREATE TYPE "public"."ActivityPollVoterVisibility" AS ENUM (
  'COUNTS_ONLY',
  'PARTICIPANTS_VISIBLE',
  'MANAGERS_ONLY'
);

CREATE TYPE "public"."ActivityPollBallotStatus" AS ENUM (
  'SUBMITTED',
  'WITHDRAWN',
  'REMOVED_BY_MODERATOR'
);

CREATE TABLE "public"."ActivityPoll" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "createdByProfileId" TEXT NOT NULL,
  "question" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "kind" "public"."ActivityPollKind" NOT NULL DEFAULT 'SINGLE_CHOICE',
  "maxSelections" INTEGER,
  "status" "public"."ActivityPollStatus" NOT NULL DEFAULT 'OPEN',
  "resultVisibility" "public"."ActivityPollResultVisibility" NOT NULL DEFAULT 'AFTER_VOTE',
  "voterVisibility" "public"."ActivityPollVoterVisibility" NOT NULL DEFAULT 'COUNTS_ONLY',
  "closesAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "finalOptionId" TEXT,
  "finalNote" VARCHAR(300),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ActivityPollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityPollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ActivityPollShare" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "audience" "public"."ActivityPollAudience" NOT NULL DEFAULT 'MEMBERS_ONLY',
  "guestIdentityMode" "public"."ActivityPollGuestIdentityMode",
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByProfileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityPollShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ActivityPollBallot" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "profileId" TEXT,
  "guestKeyHash" VARCHAR(64),
  "guestNickname" VARCHAR(30),
  "guestDisplayCode" VARCHAR(8),
  "editTokenHash" VARCHAR(64),
  "isAnonymousGuest" BOOLEAN NOT NULL DEFAULT false,
  "status" "public"."ActivityPollBallotStatus" NOT NULL DEFAULT 'SUBMITTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "removedReason" VARCHAR(200),
  "removedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityPollBallot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ActivityPollSelection" (
  "id" TEXT NOT NULL,
  "ballotId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityPollSelection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ActivityPollAuditLog" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "actorProfileId" TEXT,
  "action" VARCHAR(64) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityPollAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityPoll_finalOptionId_key"
ON "public"."ActivityPoll"("finalOptionId");
CREATE INDEX "ActivityPoll_activityId_status_createdAt_idx"
ON "public"."ActivityPoll"("activityId", "status", "createdAt");
CREATE INDEX "ActivityPoll_createdByProfileId_createdAt_idx"
ON "public"."ActivityPoll"("createdByProfileId", "createdAt");

CREATE UNIQUE INDEX "ActivityPollOption_pollId_position_key"
ON "public"."ActivityPollOption"("pollId", "position");
CREATE INDEX "ActivityPollOption_pollId_idx"
ON "public"."ActivityPollOption"("pollId");

CREATE UNIQUE INDEX "ActivityPollShare_pollId_key"
ON "public"."ActivityPollShare"("pollId");
CREATE UNIQUE INDEX "ActivityPollShare_tokenHash_key"
ON "public"."ActivityPollShare"("tokenHash");
CREATE INDEX "ActivityPollShare_createdByProfileId_createdAt_idx"
ON "public"."ActivityPollShare"("createdByProfileId", "createdAt");

CREATE UNIQUE INDEX "ActivityPollBallot_editTokenHash_key"
ON "public"."ActivityPollBallot"("editTokenHash");
CREATE UNIQUE INDEX "ActivityPollBallot_pollId_profileId_key"
ON "public"."ActivityPollBallot"("pollId", "profileId");
CREATE UNIQUE INDEX "ActivityPollBallot_pollId_guestKeyHash_key"
ON "public"."ActivityPollBallot"("pollId", "guestKeyHash");
CREATE INDEX "ActivityPollBallot_pollId_status_updatedAt_idx"
ON "public"."ActivityPollBallot"("pollId", "status", "updatedAt");
CREATE INDEX "ActivityPollBallot_profileId_updatedAt_idx"
ON "public"."ActivityPollBallot"("profileId", "updatedAt");

CREATE UNIQUE INDEX "ActivityPollSelection_ballotId_optionId_key"
ON "public"."ActivityPollSelection"("ballotId", "optionId");
CREATE INDEX "ActivityPollSelection_optionId_idx"
ON "public"."ActivityPollSelection"("optionId");

CREATE INDEX "ActivityPollAuditLog_pollId_createdAt_idx"
ON "public"."ActivityPollAuditLog"("pollId", "createdAt");
CREATE INDEX "ActivityPollAuditLog_actorProfileId_createdAt_idx"
ON "public"."ActivityPollAuditLog"("actorProfileId", "createdAt");

ALTER TABLE "public"."ActivityPoll"
ADD CONSTRAINT "ActivityPoll_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPoll"
ADD CONSTRAINT "ActivityPoll_createdByProfileId_fkey"
FOREIGN KEY ("createdByProfileId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollOption"
ADD CONSTRAINT "ActivityPollOption_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "public"."ActivityPoll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPoll"
ADD CONSTRAINT "ActivityPoll_finalOptionId_fkey"
FOREIGN KEY ("finalOptionId") REFERENCES "public"."ActivityPollOption"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollShare"
ADD CONSTRAINT "ActivityPollShare_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "public"."ActivityPoll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollShare"
ADD CONSTRAINT "ActivityPollShare_createdByProfileId_fkey"
FOREIGN KEY ("createdByProfileId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollBallot"
ADD CONSTRAINT "ActivityPollBallot_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "public"."ActivityPoll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollBallot"
ADD CONSTRAINT "ActivityPollBallot_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollSelection"
ADD CONSTRAINT "ActivityPollSelection_ballotId_fkey"
FOREIGN KEY ("ballotId") REFERENCES "public"."ActivityPollBallot"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollSelection"
ADD CONSTRAINT "ActivityPollSelection_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "public"."ActivityPollOption"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollAuditLog"
ADD CONSTRAINT "ActivityPollAuditLog_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "public"."ActivityPoll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityPollAuditLog"
ADD CONSTRAINT "ActivityPollAuditLog_actorProfileId_fkey"
FOREIGN KEY ("actorProfileId") REFERENCES "public"."UserProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
