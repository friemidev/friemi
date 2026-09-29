-- Realtime Authorization evaluates SELECT policies as the JWT's database
-- role. Without the table privilege, every private subscription is rejected
-- before the room-specific RLS policy can authorize it.
GRANT SELECT ON realtime.messages TO authenticated;
