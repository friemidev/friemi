BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- Keep defaults already provided by the original table migrations.
ALTER TABLE "ActivityPriorityOverride" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CouponClaimCode" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DrawGuessWordBank" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TopNewsItem" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PlanetMomentLike"
  DROP CONSTRAINT "PlanetMomentLike_momentId_fkey",
  DROP CONSTRAINT "PlanetMomentLike_profileId_fkey",
  ADD CONSTRAINT "PlanetMomentLike_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "PlanetMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PlanetMomentLike_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanetMomentCommentLike"
  DROP CONSTRAINT "PlanetMomentCommentLike_commentId_fkey",
  DROP CONSTRAINT "PlanetMomentCommentLike_profileId_fkey",
  ADD CONSTRAINT "PlanetMomentCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PlanetMomentComment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PlanetMomentCommentLike_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL truncated the original long index name; preserve its uniqueness.
DO $$
BEGIN
  IF to_regclass('public."DrawGuessReport_roomId_roundNumber_reporterProfileId_targetKind"') IS NOT NULL
     AND to_regclass('public."DrawGuessReport_roomId_roundNumber_reporterProfileId_target_key"') IS NULL THEN
    ALTER INDEX "DrawGuessReport_roomId_roundNumber_reporterProfileId_targetKind"
      RENAME TO "DrawGuessReport_roomId_roundNumber_reporterProfileId_target_key";
  END IF;
END $$;

COMMIT;
