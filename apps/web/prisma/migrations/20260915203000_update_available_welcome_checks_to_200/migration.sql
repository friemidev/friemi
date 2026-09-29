UPDATE "FriemiCheck"
SET "coinValue" = 200,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" = 'WELCOME'
  AND "status" = 'AVAILABLE';
