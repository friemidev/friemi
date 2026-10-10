-- Booking dates belong to each merchant store. Different stores may hold
-- confirmed reservations on the same calendar date.
DROP INDEX IF EXISTS "MerchantResidencySlot_confirmed_date_key";
