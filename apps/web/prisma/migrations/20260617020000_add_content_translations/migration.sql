-- CreateTable
CREATE TABLE "ContentTranslation" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'deepl',
    "detectedSourceLocale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentTranslation_entityType_entityId_field_locale_sourceHash_key" ON "ContentTranslation"("entityType", "entityId", "field", "locale", "sourceHash");

-- CreateIndex
CREATE INDEX "ContentTranslation_entityType_entityId_locale_idx" ON "ContentTranslation"("entityType", "entityId", "locale");

-- CreateIndex
CREATE INDEX "ContentTranslation_locale_createdAt_idx" ON "ContentTranslation"("locale", "createdAt");
