CREATE TYPE "public"."FriemiCoinTransactionType" AS ENUM (
  'CHECK_REDEEMED',
  'RECHARGE',
  'GIFT_SENT',
  'GIFT_REFUNDED',
  'MANUAL_ADJUSTMENT'
);

ALTER TABLE "public"."FriemiCheck"
ADD COLUMN "coinValue" INTEGER;

UPDATE "public"."FriemiCheck"
SET "coinValue" = 500
WHERE "type" = 'WELCOME'
  AND "coinValue" IS NULL;

CREATE TABLE "public"."UserFriemiCoinBalance" (
  "profileId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "earnedTotal" INTEGER NOT NULL DEFAULT 0,
  "spentTotal" INTEGER NOT NULL DEFAULT 0,
  "lastTransactionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserFriemiCoinBalance_pkey" PRIMARY KEY ("profileId")
);

CREATE TABLE "public"."FriemiCoinTransaction" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" "public"."FriemiCoinTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "checkId" TEXT,
  "sourceKey" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FriemiCoinTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FriemiCoinTransaction_checkId_key"
ON "public"."FriemiCoinTransaction"("checkId");

CREATE INDEX "FriemiCoinTransaction_profileId_createdAt_idx"
ON "public"."FriemiCoinTransaction"("profileId", "createdAt");

CREATE INDEX "FriemiCoinTransaction_type_createdAt_idx"
ON "public"."FriemiCoinTransaction"("type", "createdAt");

ALTER TABLE "public"."UserFriemiCoinBalance"
ADD CONSTRAINT "UserFriemiCoinBalance_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."FriemiCoinTransaction"
ADD CONSTRAINT "FriemiCoinTransaction_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."FriemiCoinTransaction"
ADD CONSTRAINT "FriemiCoinTransaction_checkId_fkey"
FOREIGN KEY ("checkId") REFERENCES "public"."FriemiCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
