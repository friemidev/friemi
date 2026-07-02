-- CreateEnum
CREATE TYPE "MobilePlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateTable
CREATE TABLE "MobileDevice" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "platform" "MobilePlatform" NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "deviceId" TEXT,
    "appVersion" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileDevice_fcmToken_key" ON "MobileDevice"("fcmToken");

-- CreateIndex
CREATE INDEX "MobileDevice_userProfileId_disabledAt_lastSeenAt_idx" ON "MobileDevice"("userProfileId", "disabledAt", "lastSeenAt");

-- CreateIndex
CREATE INDEX "MobileDevice_platform_deviceId_idx" ON "MobileDevice"("platform", "deviceId");

-- AddForeignKey
ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
