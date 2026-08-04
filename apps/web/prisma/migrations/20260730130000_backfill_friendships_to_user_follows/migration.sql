INSERT INTO "public"."UserFollow" ("id", "followerId", "followingId", "createdAt")
SELECT
  'friendship_follow_' || md5("id" || ':a_to_b'),
  "userAId",
  "userBId",
  "createdAt"
FROM "public"."Friendship"
WHERE "userAId" <> "userBId"
ON CONFLICT ("followerId", "followingId") DO NOTHING;

INSERT INTO "public"."UserFollow" ("id", "followerId", "followingId", "createdAt")
SELECT
  'friendship_follow_' || md5("id" || ':b_to_a'),
  "userBId",
  "userAId",
  "createdAt"
FROM "public"."Friendship"
WHERE "userAId" <> "userBId"
ON CONFLICT ("followerId", "followingId") DO NOTHING;
