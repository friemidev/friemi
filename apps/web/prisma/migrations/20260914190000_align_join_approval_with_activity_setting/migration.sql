WITH "autoApprovedParticipants" AS (
  UPDATE "public"."ActivityParticipant" AS participant
  SET
    "status" = 'APPROVED',
    "updatedAt" = CURRENT_TIMESTAMP
  FROM "public"."Activity" AS activity
  WHERE participant."activityId" = activity."id"
    AND participant."status" = 'PENDING'
    AND activity."requiresApproval" = false
  RETURNING participant."activityId", participant."userProfileId"
)
UPDATE "public"."Notification" AS notification
SET
  "type" = 'PARTICIPATION_CONFIRMED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "autoApprovedParticipants" AS participant
JOIN "public"."Activity" AS activity
  ON activity."id" = participant."activityId"
WHERE notification."activityId" = participant."activityId"
  AND notification."type" = 'PARTICIPATION_PENDING'
  AND (
    notification."recipientId" = participant."userProfileId"
    OR (
      notification."recipientId" = activity."organizerId"
      AND notification."actorId" = participant."userProfileId"
    )
  );
