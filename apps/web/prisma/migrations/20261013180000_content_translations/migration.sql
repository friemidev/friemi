CREATE INDEX "ContentTranslation_sourceHash_field_locale_idx" ON "ContentTranslation"("sourceHash", "field", "locale");

CREATE TABLE "ContentTranslationTask" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "lockToken" TEXT,
  "lockedUntil" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentTranslationTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentTranslationTask_entityType_entityId_field_locale_key" ON "ContentTranslationTask"("entityType", "entityId", "field", "locale");
CREATE INDEX "ContentTranslationTask_status_nextAttemptAt_lockedUntil_idx" ON "ContentTranslationTask"("status", "nextAttemptAt", "lockedUntil");

CREATE TABLE "ContentTranslationBudget" (
  "id" TEXT NOT NULL,
  "usedCharacters" INTEGER NOT NULL DEFAULT 0,
  "pausedUntil" TIMESTAMP(3),
  "pauseReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentTranslationBudget_pkey" PRIMARY KEY ("id")
);

-- Translation sources and cached results can contain private messages. Only
-- the authenticated application server may access these tables; all browser
-- requests go through application APIs that check the source permissions.
ALTER TABLE public."ContentTranslation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentTranslationTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentTranslationBudget" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."ContentTranslation", public."ContentTranslationTask", public."ContentTranslationBudget" FROM PUBLIC;

-- Supabase grants privileges on new public tables to these roles by default.
-- Plain PostgreSQL test databases may not define them.
DO $$
DECLARE
  browser_role text;
BEGIN
  FOR browser_role IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public."ContentTranslation", public."ContentTranslationTask", public."ContentTranslationBudget" FROM %I',
      browser_role
    );
  END LOOP;
END;
$$;

-- No browser policies. Keep the owner/BYPASSRLS server connection working.
