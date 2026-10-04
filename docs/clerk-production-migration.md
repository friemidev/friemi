# Clerk Production Migration

## Status (2026-10-04)

Preparation and authorized DNS setup only. No production Clerk key switch, user
import or database identity update has been performed by this task. The five
Production DNS records have now been saved and verified. Do not deploy a new Clerk
publishable key on its own.

- Branch: `codex/clerk-production-migration`, based on `origin/dev` at `9aaf563`.
- Source application: `app_3FX8OBLdQ6eEf8D0Zdv3ZOwgHve`.
- Source instance: `ins_3FX8OCpOcSbXp7CemiePLNOj3sL` (Development, 100 exported users).
- Target instance: `ins_3Fr1pCETGrgJFA9mdZ1iP5rx3lb` (Production, initially empty).
- Production Supabase: `xyavgkupjnoumlzwkzoq`.
- Preview Supabase: `dryhbxognbrljslzciuh`.
- Production website: `https://www.friemi.com`.
- Production read-only SQL preflight: 127 profiles, 126 ACTIVE, 1 DELETED,
  121 Clerk-style user IDs and 6 duplicate-email groups. Reconcile these with the
  complete 100-user export before importing or applying bindings. No automatic
  email merge is safe. A legacy `_backup_userprofile_ghost_email_bindings_20260629`
  table exists; leave this historical backup untouched.

Vercel's Production and Preview publishable key points to
`simple-ewe-14.clerk.accounts.dev`. The local `apps/web/.env` points to
`tolerant-mayfly-67.clerk.accounts.dev` and its secret key returned 35 users, not
the 100-user source instance. Do not use it for this migration. The old saved
production database password failed authentication via the verified session
pooler. The current Production configuration has now been retrieved through the
isolated Friemi CLI login described below; a read-only connection to the correct
Production database succeeded. The default CLI login was not changed.

The user supplied the downloaded Development export at
`/home/ubuntu23/Bureau/ins_3FX8OCpOcSbXp7CemiePLNOj3sL.csv`. Its permissions were
restricted to `0600`. A private copy, current source API snapshot, Production
configuration and read-only profile snapshot are stored outside Git under
`/home/ubuntu23/.local/share/friemi/clerk-migration/20261004/` (directory `0700`,
files `0600`). These are sensitive local artifacts, not committed files.

Verified results:

- CSV: 100 unique user IDs, no duplicate primary emails, 21 bcrypt password
  digests, no TOTP secrets, 10 primary Apple relay addresses.
- Current source API: exactly the same 100 IDs; 21 password-enabled users,
  53 native Apple/Google `external_id` values, no banned/locked/MFA-enabled users.
- Production database: all 100 source IDs have exact existing profile matches.
  Twenty other ACTIVE Clerk-style IDs are absent from the current instance.
  All twenty were subsequently matched by exact ID in the older 35-user instance
  used by the local environment. Preserve these historical profiles and their
  bindings; do not merge by email or remove them. The planner intentionally still
  blocks them pending an explicit audited preserve-only path. Do not edit blockers
  out of its output. All original 127 profiles remain unchanged.
- PostgreSQL version is 17.6. A fresh full custom-format dump was taken at
  `2026-10-04T20:27:17Z` (10,122,000 bytes). Its TOC has 1,320 entries. Restore
  succeeded with `--exit-on-error` into a disposable, network-isolated Supabase
  PostgreSQL 17 container. The restored database has 96 public tables, all 127
  exact original profile IDs/Clerk bindings/statuses, and no unvalidated public
  constraints. The disposable container was then removed. The private archive,
  SHA-256 and restore report remain outside Git. This verifies database recovery,
  not the as-yet-unavailable real Production identity remapping.
- Offline import preparation passed for all 100 users: 21 bcrypt digests,
  53 preserved native external IDs and 36 source Clerk avatar URLs. No create-user
  API calls were made. The prepared batch contains sensitive data and is private.
- Production SSO connections still show `Setup required` for Google and Apple.
  Among three source web-Apple users, one uses a private relay email and does not
  have a native `apple:` binding. Native login alone is not adequate evidence that
  this person's existing account will remain accessible after cutover.

The user explicitly approved saving the existing Production key locally and
adding the five Clerk CNAMEs. DNS setup is complete; do not ask for the same
authorization again or create duplicate records.

| DNS-only CNAME | Target |
| --- | --- |
| `clerk.friemi.com` | `frontend-api.clerk.services` |
| `accounts.friemi.com` | `accounts.clerk.services` |
| `clkmail.friemi.com` | `mail.o3nd9g81xzvg.clerk.services` |
| `clk._domainkey.friemi.com` | `dkim1.o3nd9g81xzvg.clerk.services` |
| `clk2._domainkey.friemi.com` | `dkim2.o3nd9g81xzvg.clerk.services` |

All five have Auto TTL and resolve correctly. Cloudflare now has nine records;
the original apex, www and two Vercel verification records were left unchanged.
Clerk reports Frontend API Verified, Account portal Verified and Email 3/3
Verified. SSL certificates were still Issuing at this checkpoint. The public
`https://clerk.friemi.com/.well-known/jwks.json` returned HTTP 200 with one public
key and normal TLS verification. The account portal had valid TLS but still
returned Cloudflare HTTP 403 (`DNS points to prohibited IP`) during provisioning.
Do not interpret DNS verification as a successful account-portal/login test;
recheck provider provisioning before cutover, without disabling TLS checks or
changing the approved DNS-only targets to work around the error.

Key handoff remains: the existing Production secret was successfully read from
the authorized dashboard without displaying it in tool output, but Chrome blocked
submission to a one-time loopback-only private file receiver with
`ERR_BLOCKED_BY_CLIENT`. The restriction was not bypassed. The receiver was stopped,
its tab and temporary script removed, and the in-memory key cleared. The private
`target-clerk.env` still has an empty secret; the user has been asked to paste the
existing key into that local file, not chat. Do not claim it was saved or that the
target Backend API was verified. Google web OAuth and Apple Developer configuration
remain additional release gates, not optional follow-ups.

## Isolated Vercel CLI

Friemi credentials are in `/home/ubuntu23/.config/friemi/vercel`, not the default
Vercel CLI configuration. The directory is `0700` and its `auth.json` is `0600`.
The isolated login was verified as `friemidev-9294`; the default `vercel whoami`
still returns `dandelion-technologie`. No logout, global account switch or shell
profile change was performed.

Every Friemi CLI command must explicitly use this configuration. Changing the
working directory alone does not switch authentication, and `--scope` selects a
team, not a different login. This is configuration isolation, not a restriction
of the account's actual Vercel permissions.

```bash
vercel --global-config "$HOME/.config/friemi/vercel" --scope friemi whoami
vercel --global-config "$HOME/.config/friemi/vercel" --scope friemi project inspect friemi
```

Only the migration worktree's ignored `.vercel` directory was linked to
`friemi/friemi` (`prj_3uVe9Gg1U6QD4H4ZJoB5xigCsISS`, root `apps/web`). Other projects'
local links were not changed. Production environment variables were downloaded
for migration checks only; no environment values or deployments were updated.

## Invariants

1. Preserve `UserProfile.id`, friend code, nickname, role, status, wallet, referral
   rewards, relationships, activities, messages, purchases and game history.
2. Change only the verified `UserProfile.clerkUserId` bindings during cutover.
3. Never merge users just because their email addresses look alike. Do not promote
   an unverified address to verified. Deleted accounts must not be reactivated.
4. Preserve Clerk `external_id`. Friemi's native OAuth route stores
   `apple:<subject>` or `google:<subject>` there. The stock migration tool's use of
   `external_id` for the old Clerk ID must not overwrite these values.
5. Use server-only `private_metadata.friemiMigration` to record the exact source
   instance, source user ID and target instance. Do not use public or unsafe
   metadata as authority to attach business data.
6. Clerk sessions cannot be transferred across instances. Plan for one sign-in;
   do not promise invisible session continuation. A new Production key alone is
   not a migration.

## Release Gates

- [x] Download, secure and validate the complete source CSV, including password
      hash/hasher for users with passwords. Obtain complete source Backend API JSON
      for verification states, native external IDs, metadata and account restrictions.
- [ ] Verify key-to-instance identity and user count for both instances. A key
      prefix (`sk_test_` / `sk_live_`) by itself is not sufficient.
- [x] Take a fresh production dump; verify `pg_restore --list` and test recovery
      in an isolated database. Do not rely on a dump made before other live changes.
- [x] Add Clerk's five CNAMEs as DNS-only, leaving apex/www/Vercel records alone.
      Complete DNS verification in Clerk.
- [ ] Verify TLS certificates have finished issuing for both Clerk subdomains.
- [ ] Configure Google Production web OAuth with matching consent/redirect URLs;
      preserve the existing iOS OAuth client. Test actual Google account linking.
- [ ] Verify native Apple sign-in and existing relay-email users. The Apple
      Developer account is held by another programmer: web Apple Services ID, key,
      Team ID and relay sender configuration require that person's cooperation.
      Do not assume email fallback preserves access for every Apple user.
- [ ] Match all enabled login methods, signup restrictions, metadata, administrator
      access and redirect allowlists. Handle MFA/passkeys or other unsupported factors
      separately; do not silently remove them.
- [ ] Import users into Production idempotently, preserving password hashes,
      primary/verified identifiers, native external IDs and ban/lock states. Recover
      interrupted imports using exact migration markers, not email-only matching.
      Keep Production webhook delivery disabled during import to avoid duplicate
      `UserProfile` rows and welcome rewards.
- [ ] Compare imported accounts against source. Password-enabled flags are only a
      sanity check, not proof that a password works. Test a consenting test account
      with its original password and test native/web OAuth on real devices.
- [ ] Inspect actual database policies and column types before updating any
      non-Prisma auth references. The private drawing Realtime policy compares JWT
      `sub` with `UserProfile.clerkUserId`. Configure Supabase to trust the Production
      Clerk issuer and ensure `role: authenticated`; test private Realtime access.
- [ ] Inventory `ADMIN_CLERK_USER_IDS`, webhooks, signing secrets, mobile embedded
      keys and any other user-ID allowlists. Do not copy Development secrets to live.
- [ ] Rehearse mapping and rollback on an isolated production restore. Run the
      generated SQL with its default `ROLLBACK` on production as a final check.
- [ ] Arrange a short controlled cutover. Stop signups, profile writes and old/new
      webhook delivery, drain in-flight requests and reconcile source changes since
      export. Take a final snapshot. Old deployments must not write old Clerk IDs
      after remapping, or the current profile upsert code can create duplicates.
- [ ] Apply mapping, deploy matching Production keys, activate the Production
      webhook secret and issuer, then reopen traffic only after smoke tests. A rolling
      key-only deployment without gating writes is unsafe.
- [ ] Verify old user profile IDs, balances, chats, join history and native login;
      test a new signup. Compare profile counts and business-table integrity.
- [ ] Keep the original instance and private audit artifacts for rollback. Do not
      delete source users. Rollback requires the same write gate and restoration of
      environment/webhook/issuer configuration as well as identity SQL.

Code follows the existing release rule: dev first; the user promotes main.
Preview and Production must be decided separately. Do not remap Preview while it
still uses Development authentication. There is no business-schema migration in
this preparatory change.

## Offline Planner

The planner performs no API requests and executes no SQL. It uses explicit
instance/project IDs and rejects partial exports, identity collisions, changed
native IDs, verification/password/ban/lock discrepancies, or missing mappings.
Unresolved active profiles stop SQL generation. It never outputs addresses or
credentials to stdout and never imports or deletes users.

Input envelopes (private local files):

```json
{
  "instanceId": "ins_source",
  "totalCount": 100,
  "users": ["complete raw Clerk Backend API user objects, not these strings"]
}
```

The target envelope has the same structure. Each imported target user must retain
its source identity and include:

```json
{
  "private_metadata": {
    "friemiMigration": {
      "sourceInstanceId": "ins_source",
      "sourceUserId": "user_original",
      "targetInstanceId": "ins_target"
    }
  }
}
```

Database envelope: `{ "projectRef": "<verified project ref>", "profiles": [...] }`.
Use a complete read-only export with `id`, `clerkUserId` and `status` for every
profile. The Supabase SQL Editor must be set to the correct project; its database
name is `postgres` in both environments and cannot prove project identity.

```sql
BEGIN READ ONLY;
SELECT jsonb_build_object(
  'projectRef', 'xyavgkupjnoumlzwkzoq',
  'profiles', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'clerkUserId', "clerkUserId", 'status', status
  ) ORDER BY id), '[]'::jsonb)
)
FROM public."UserProfile";
COMMIT;
```

```bash
node scripts/clerk-migration.mjs \
  --source /private/source.json --target /private/target.json \
  --database /private/profiles.json \
  --source-instance ins_SOURCE --target-instance ins_TARGET \
  --database-project xyavgkupjnoumlzwkzoq \
  --output /private/new-plan-directory
node --test scripts/clerk-migration/plan.test.mjs
CLERK_MIGRATION_LOCAL_SQL_TEST=1 node --test scripts/clerk-migration/sql.test.mjs
```

The optional SQL integration test creates and drops only its own randomly named
database through the local PostgreSQL Unix socket. It checks rehearsal rollback,
real commit, idempotent retries, reverse rollback, unchanged business data and
foreign keys, identity collisions, newly deleted users, and concurrent signups.

The output directory must be new, outside the checkout, and is created with
private permissions. Outputs are `plan.json`, `forward.sql`, `rollback.sql`.
Blocked plans produce only `plan.json` and exit code 2. Both SQL files default to
`ROLLBACK`; `--commit --maintenance-confirmed` generates committing scripts but
still does not execute them. SQL locks the profile table, checks counts and
bindings, rejects deleted profiles/collisions, and verifies every changed binding
within one transaction. Already-applied rows are accepted by the same saved SQL.

The planner is not a substitute for login tests, source/target API authenticity,
metadata comparison, key/issuer configuration, a verified backup or write gating.
Its fingerprint is for audit comparison, not a signature or database identity
proof. Do not hand-edit blockers out of a plan.

## Offline Import Preparation

The preparation command is local only: it does not accept API keys, contact Clerk,
create accounts, send email or execute database writes. It uses Python 3's standard
CSV parser and checks the entire CSV against the raw source API snapshot before
writing anything. It rejects duplicate/incomplete exports, changed identities,
unverified/additional identifiers, unsupported MFA/passkeys/SSO, restricted
accounts, inconsistent password state and reserved metadata marker collisions.
This intentionally narrow importer supports the audited source (one verified email
per account); other source shapes require separately reviewed migration logic.

```bash
node scripts/clerk-migration/prepare-import.mjs \
  --source /private/source-users-api.json --csv /private/source-users.csv \
  --source-instance ins_SOURCE --target-instance ins_TARGET \
  --output /absolute/private/new-import-directory
node --test scripts/clerk-migration/import-batch.test.mjs scripts/clerk-migration/plan.test.mjs
```

The new output directory is `0700`, and `import-batch.json` is `0600`. It contains
password digests and user data; never commit, print or attach it to a task. Payloads
preserve the native `external_id` and put the old identity in private metadata.
Avatar URLs are a separate required follow-up, not create-user payload fields:
upload the source images to the target before enabling profile synchronization,
or Clerk-managed avatars could be overwritten with target defaults. OAuth external
account connections and active sessions are not imported by these payloads.

This is not an executable bulk-import client. Before actual import, verify the
target key/instance, current target accounts and disabled target webhooks; add
idempotent checkpointing and exact marker-based resumption. Refresh the exports
before cutover, account for password changes since CSV export, and test all login
methods. A payload passing validation is not proof of successful account migration.

Validation completed: 59 unit tests and one real local PostgreSQL integration test
(60 passing), plus the separate full-production-dump recovery test. No real
Production account import, password/OAuth login rehearsal, or production database
write has been performed.

## References

- [Clerk migration overview](https://clerk.com/docs/guides/development/migrating/overview)
- [Clerk migration tool](https://github.com/clerk/migration-tool)
- [Create user API](https://clerk.com/docs/reference/backend/user/create-user)
- [Production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk integration with Supabase](https://supabase.com/docs/guides/auth/third-party/clerk)
