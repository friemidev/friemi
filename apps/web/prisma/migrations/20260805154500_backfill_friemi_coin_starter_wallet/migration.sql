WITH welcome_check_profiles AS (
  SELECT "id" AS "profileId"
  FROM "public"."UserProfile" profile
  WHERE NOT EXISTS (
    SELECT 1
    FROM "public"."FriemiCheck" check_item
    WHERE check_item."profileId" = profile."id"
      AND check_item."sourceKey" = 'welcome'
  )
)
INSERT INTO "public"."FriemiCheck" (
  "id",
  "profileId",
  "type",
  "status",
  "coinValue",
  "sourceKey",
  "note",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('welcome-check-', "profileId"),
  "profileId",
  'WELCOME'::"public"."FriemiCheckType",
  'AVAILABLE'::"public"."FriemiCheckStatus",
  500,
  'welcome',
  'New user welcome Friemi check',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM welcome_check_profiles;

WITH initial_coin_profiles AS (
  SELECT "id" AS "profileId"
  FROM "public"."UserProfile" profile
  WHERE NOT EXISTS (
    SELECT 1
    FROM "public"."FriemiCoinTransaction" tx
    WHERE tx."profileId" = profile."id"
      AND tx."sourceKey" = 'initial-friemi-coin-balance'
  )
),
updated_balances AS (
  INSERT INTO "public"."UserFriemiCoinBalance" (
    "profileId",
    "balance",
    "earnedTotal",
    "spentTotal",
    "lastTransactionAt",
    "createdAt",
    "updatedAt"
  )
  SELECT
    "profileId",
    100,
    100,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM initial_coin_profiles
  ON CONFLICT ("profileId") DO UPDATE
  SET
    "balance" = "UserFriemiCoinBalance"."balance" + 100,
    "earnedTotal" = "UserFriemiCoinBalance"."earnedTotal" + 100,
    "lastTransactionAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "profileId", "balance"
)
INSERT INTO "public"."FriemiCoinTransaction" (
  "id",
  "profileId",
  "type",
  "amount",
  "balanceAfter",
  "sourceKey",
  "note",
  "createdAt"
)
SELECT
  CONCAT('initial-fc-', "profileId"),
  "profileId",
  'MANUAL_ADJUSTMENT'::"public"."FriemiCoinTransactionType",
  100,
  "balance",
  'initial-friemi-coin-balance',
  'Initial Friemi coin balance',
  CURRENT_TIMESTAMP
FROM updated_balances;
