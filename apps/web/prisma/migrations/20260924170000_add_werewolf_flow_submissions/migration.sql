ALTER TYPE "GameToolSubmissionKind" ADD VALUE IF NOT EXISTS 'WEREWOLF_SHERIFF_VOTE';
ALTER TYPE "GameToolSubmissionKind" ADD VALUE IF NOT EXISTS 'WEREWOLF_EXILE_VOTE';
ALTER TYPE "GameToolSubmissionKind" ADD VALUE IF NOT EXISTS 'WEREWOLF_NIGHT_ACTION';

ALTER TABLE "GameToolSubmission"
ADD COLUMN IF NOT EXISTS "actionKey" VARCHAR(32) NOT NULL DEFAULT '';

UPDATE "GameToolSubmission"
SET "actionKey" = CASE
  WHEN "value" LIKE 'WITCH\_%' ESCAPE '\' THEN 'WITCH'
  ELSE split_part("value", ':', 1)
END
WHERE "kind"::text = 'WEREWOLF_NIGHT_ACTION'
  AND "actionKey" = '';

DROP INDEX IF EXISTS "GameToolSubmission_roomId_roundIndex_kind_seatId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "GameToolSubmission_room_round_kind_seat_action_key"
ON "GameToolSubmission"("roomId", "roundIndex", "kind", "seatId", "actionKey");
