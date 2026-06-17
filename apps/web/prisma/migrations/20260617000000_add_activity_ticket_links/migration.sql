ALTER TABLE "public"."Activity" ADD COLUMN "ticketUrl" TEXT;
ALTER TABLE "public"."Activity" ADD COLUMN "ticketLabel" TEXT;
ALTER TABLE "public"."PublicEvent" ADD COLUMN "ticketUrl" TEXT;
ALTER TABLE "public"."PublicEvent" ADD COLUMN "ticketLabel" TEXT;

CREATE INDEX "Activity_ticketUrl_idx" ON "public"."Activity"("ticketUrl" ASC);
CREATE INDEX "PublicEvent_ticketUrl_idx" ON "public"."PublicEvent"("ticketUrl" ASC);
