-- Add co-manager support for user-hosted activity teams.

CREATE TABLE "ActivityCoManager" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "managerProfileId" TEXT NOT NULL,
    "addedByProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityCoManager_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityManagementLog" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityManagementLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityCoManager_activityId_managerProfileId_key"
    ON "ActivityCoManager"("activityId", "managerProfileId");

CREATE INDEX "ActivityCoManager_managerProfileId_idx"
    ON "ActivityCoManager"("managerProfileId");

CREATE INDEX "ActivityCoManager_addedByProfileId_idx"
    ON "ActivityCoManager"("addedByProfileId");

CREATE INDEX "ActivityManagementLog_activityId_createdAt_idx"
    ON "ActivityManagementLog"("activityId", "createdAt");

CREATE INDEX "ActivityManagementLog_actorId_createdAt_idx"
    ON "ActivityManagementLog"("actorId", "createdAt");

ALTER TABLE "ActivityCoManager"
    ADD CONSTRAINT "ActivityCoManager_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityCoManager"
    ADD CONSTRAINT "ActivityCoManager_managerProfileId_fkey"
    FOREIGN KEY ("managerProfileId") REFERENCES "UserProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityCoManager"
    ADD CONSTRAINT "ActivityCoManager_addedByProfileId_fkey"
    FOREIGN KEY ("addedByProfileId") REFERENCES "UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityManagementLog"
    ADD CONSTRAINT "ActivityManagementLog_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityManagementLog"
    ADD CONSTRAINT "ActivityManagementLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
