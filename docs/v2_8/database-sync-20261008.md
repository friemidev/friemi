# Database Synchronization, 2026-10-08

## Release Scope

Home V2 and NOW invites were explicitly excluded from dev in `8323a89`.
The `codex/home-v2` branch is preserved. Its existing Preview tables and three
migration records are retained; none were added to Production.

The application schema reconciliation was committed in `278de71`. This operation
did not push main, redeploy Production, change Clerk identities, or copy business
records between environments.

## Applied Migrations

Preview:

- `20261008140000_reconcile_application_schema`

Production:

- `20261008100000_inventory_ticket_short_code_and_bag_seen`
- `20261008140000_reconcile_application_schema`

The ticket migration adds the optional redemption short code, bag read timestamp,
and indexes. Its documented backfill marks the seven existing Production tickets
as seen; ownership, redemption state, quantities, and existing business fields
remain unchanged.

The reconciliation preserves existing updated-at defaults in both Prisma and
PostgreSQL, aligns the four planet-like foreign keys with the model's update
cascade behavior, and renames the truncated drawing-report unique index without
removing uniqueness or data.

## Verification

- Fresh restricted-permission public-schema backups were taken for both projects.
- The Production archive was restored into an isolated, network-disabled
  PostgreSQL 17 container. Both migrations passed there before live execution.
- All 99 pre-existing public business/backup tables matched their original row
  counts and content hashes in rehearsal, excluding the two newly added ticket
  fields from the comparison.
- Both environments now satisfy all 88 dev migrations, with no pending, failed,
  or checksum-mismatched application migrations. Preview additionally retains
  the three independent Home V2 migrations, for 91 successful records total.
- Eight historical Preview migration checksums were normalized only after
  verifying their DDL postconditions against the application schema. No old
  migration SQL was replayed. Original records and guarded normalization SQL
  remain in the private audit archive.
- Catalog comparison verified the required columns, indexes, validated
  constraints, and enum values for all 98 Prisma application tables. Existing
  NOT NULL constraints on array columns were deliberately retained.
- Both `prisma migrate status` checks report up to date. Production's remaining
  raw Prisma diff is only its historical backup table, which must not be dropped.
- Preview's unrelated legacy tables, cross-schema references, and Home V2
  extensions were excluded from destructive reconciliation and left intact.
- Live user, activity, participation, message, inventory, and planet record
  counts were unchanged. The Production homepage returned HTTP 200.

Backups, connection files, and detailed evidence are outside Git under
`~/.local/share/friemi/database-sync/20261008-dev-a69827c/`. Keep the backups for
at least 14 days and do not commit or share their contents. Do not run the raw
introspection diff as SQL; it includes objects intentionally preserved here.

## Follow-up Releases

Future Home V2 work stays on its own branch until explicitly approved. Because
dev contains a deliberate revert, merging the same old branch again will not
automatically restore its changes; restoration needs an explicit reviewed
revert-of-revert or a new scoped change set.
