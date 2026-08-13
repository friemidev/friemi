-- Track nickname changes independently from other profile updates so the
-- once-per-day rule does not block avatar, city, or bio edits.
ALTER TABLE "public"."UserProfile"
ADD COLUMN "nicknameChangedAt" TIMESTAMP(3);
