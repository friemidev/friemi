BEGIN;

-- B1: guest-link checks move out of the common authenticated read path.
ALTER TABLE "UserProfile"
  ADD COLUMN "guestLinkFingerprint" TEXT,
  ADD COLUMN "guestLinkCheckedAt" TIMESTAMP(3),
  ADD COLUMN "guestLinkLastLinkedAt" TIMESTAMP(3);

-- B2: stable occurrence + recipient idempotency for notification fan-out.
ALTER TABLE "Notification"
  ADD COLUMN "dedupeKey" VARCHAR(80);

CREATE UNIQUE INDEX "Notification_dedupeKey_key"
  ON "Notification"("dedupeKey");

-- B4: a single monotonic room revision replaces derived sync probes.
ALTER TABLE "GameToolRoom"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION "bump_werewolf_room_revision_on_room_update"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."kind" = 'WEREWOLF'
     AND NEW."revision" = OLD."revision" THEN
    NEW."revision" := OLD."revision" + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GameToolRoom_werewolf_revision_update"
BEFORE UPDATE ON "GameToolRoom"
FOR EACH ROW
EXECUTE FUNCTION "bump_werewolf_room_revision_on_room_update"();

CREATE OR REPLACE FUNCTION "bump_werewolf_room_revision_from_child"()
RETURNS TRIGGER AS $$
DECLARE
  target_room_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_room_id := OLD."roomId";
  ELSE
    target_room_id := NEW."roomId";
  END IF;

  UPDATE "GameToolRoom"
  SET "revision" = "revision" + 1
  WHERE "id" = target_room_id
    AND "kind" = 'WEREWOLF';

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GameToolSeat_werewolf_revision_change"
AFTER INSERT OR UPDATE OR DELETE ON "GameToolSeat"
FOR EACH ROW
EXECUTE FUNCTION "bump_werewolf_room_revision_from_child"();

CREATE TRIGGER "GameToolRoomMember_werewolf_revision_change"
AFTER INSERT OR UPDATE OR DELETE ON "GameToolRoomMember"
FOR EACH ROW
EXECUTE FUNCTION "bump_werewolf_room_revision_from_child"();

CREATE TRIGGER "GameToolEvent_werewolf_revision_change"
AFTER INSERT OR UPDATE OR DELETE ON "GameToolEvent"
FOR EACH ROW
EXECUTE FUNCTION "bump_werewolf_room_revision_from_child"();

-- B3: stable cursor scans and deletion/change reconciliation.
CREATE INDEX "DirectMessage_conversationId_createdAt_id_idx"
  ON "DirectMessage"("conversationId", "createdAt", "id");

CREATE INDEX "DirectMessage_conversationId_updatedAt_idx"
  ON "DirectMessage"("conversationId", "updatedAt");

CREATE INDEX "DirectMessageDeletion_profileId_deletedAt_messageId_idx"
  ON "DirectMessageDeletion"("profileId", "deletedAt", "messageId");

CREATE INDEX "ActivityRoomMessage_activityId_createdAt_id_idx"
  ON "ActivityRoomMessage"("activityId", "createdAt", "id");

CREATE INDEX "ActivityRoomMessage_activityId_updatedAt_idx"
  ON "ActivityRoomMessage"("activityId", "updatedAt");

CREATE INDEX "PlanetMessage_planetId_createdAt_id_idx"
  ON "PlanetMessage"("planetId", "createdAt", "id");

COMMIT;
