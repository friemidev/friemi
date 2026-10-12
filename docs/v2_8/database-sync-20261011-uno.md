# UNO database synchronization — 2026-10-11

## Scope

The user requested synchronization of both Preview and Production databases after
the UNO implementation was pushed to dev at `38057d55`.

Both databases received these migrations through `prisma migrate deploy`:

- `20261011120000_uno_rooms`
- `20261011123000_uno_server_only_tables`

The first adds the UNO enum, nullable deadline column, two tables, indexes and
foreign keys. The second closes direct browser access to UNO command receipts and
round history, and applies restrictive RLS to UNO rooms, seats and memberships.
Other games retain their existing access. Installations with RLS already enabled
do not receive broader permissive policies. The application uses the verified
`postgres` owner/BYPASSRLS connection and retains server access.

No business records were copied between environments. No main branch deployment,
production feature flag change, Data API setting change or scheduler configuration
was performed. Production UNO remains gated as “Coming soon”.

## Environment and backups

| Environment | Supabase project | Successful migrations after synchronization |
| --- | --- | --- |
| Preview | `dryhbxognbrljslzciuh` | 100: 97 dev migrations and 3 preserved Home V2 migrations |
| Production | `xyavgkupjnoumlzwkzoq` | 97 dev migrations |

Connections came from the previously verified Vercel environment archive and were
matched against the database project identities and migration histories. The
current Vercel CLI account cannot freshly retrieve the Friemi deployment settings;
this operation does not claim a fresh deployment-environment configuration audit.

Fresh public-schema/data backups were taken before writing either database. The
archives, manifest checks, connection files and detailed before/after evidence are
outside Git with restricted permissions:

`~/.local/share/friemi/database-sync/20261011-uno-38057d55/`

Keep the archives for at least 14 days. Do not commit or share their contents.

## Verification

- Preview was migrated and verified before Production was changed.
- Both databases have zero pending migrations, zero failed migrations and zero
  checksum mismatches. `prisma migrate status` reports up to date for both.
- UNO enum, timestamp precision/nullability, eight indexes, four validated
  constraints, five tables' RLS/server access and six room/member policies passed
  direct catalog checks in both databases.
- Existing user, activity, participation, direct-message, inventory and planet
  row counts match the pre-migration readings in both environments.
- The permission migration passed 50 checks in an isolated PostgreSQL 17 instance:
  browser reads/writes and reassignment into/out of UNO are denied; other games'
  CRUD remains available; server writes and cascades work; already-restricted
  databases are not opened up; plain PostgreSQL without Supabase roles is supported.
- Preview's zero-row Data API probe confirmed that its public database endpoint
  is enabled. The new policies therefore protect UNO rows even through direct
  database requests. Other existing public-table access was outside this scoped
  UNO migration and was not audited as a full-site security review.

The independent UNO deadline scheduler and a real multi-account browser session
remain separate release checks; database synchronization does not prove either.
