-- Restart the one-message stranger handshake after a mutual follow ends and
-- retain recalled messages as visible system markers for both participants.
ALTER TABLE "public"."Conversation"
ADD COLUMN "nonFriendResetAt" TIMESTAMP(3);

ALTER TABLE "public"."DirectMessage"
ADD COLUMN "recalledAt" TIMESTAMP(3);

-- Existing non-mutual conversations start a fresh handshake after deployment.
-- Current mutual-follow conversations keep their unrestricted state.
UPDATE "public"."Conversation" AS conversation
SET "nonFriendResetAt" = CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "public"."UserFollow" AS first_follow
  INNER JOIN "public"."UserFollow" AS reverse_follow
    ON reverse_follow."followerId" = first_follow."followingId"
   AND reverse_follow."followingId" = first_follow."followerId"
  WHERE first_follow."followerId" = conversation."userAId"
    AND first_follow."followingId" = conversation."userBId"
);
