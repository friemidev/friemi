# Clerk Production Migration

## Status (2026-10-04)

Production account pre-import and isolated database rehearsal are complete.
All 100 source accounts now exist in the verified Production Clerk instance.
No live Vercel Clerk key switch or production database identity update has been
performed. The five Production DNS records are verified and certificates issued.
Do not deploy a new Clerk publishable key on its own: login configuration,
real-device verification and controlled cutover gates remain open.

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
  bindings; do not merge by email or remove them. An explicit preserve-only
  manifest now checks exact profile ID, Clerk ID and status against a complete
  historical instance export (`ins_3EAUJC22NU5eaaujYY3L1ISB6Hf`). The verified plan
  maps 100 accounts, preserves 27 profiles and has zero mapping blockers. Other
  missing active profiles still block SQL generation. All original 127 live
  profile bindings and statuses were re-read and confirmed unchanged after import.
- PostgreSQL version is 17.6. A fresh full custom-format dump was taken at
  `2026-10-04T20:27:17Z` (10,122,000 bytes). Its TOC has 1,320 entries. Restore
  succeeded with `--exit-on-error` into a disposable, network-isolated Supabase
  PostgreSQL 17 container. The restored database has 96 public tables, all 127
  exact original profile IDs/Clerk bindings/statuses, and no unvalidated public
  constraints. The disposable container was then removed. The private archive,
  SHA-256 and restore report remain outside Git. This verifies database recovery,
  and the new real Production identity map was subsequently rehearsed separately.
- Offline import preparation passed for all 100 users: 21 bcrypt digests,
  53 preserved native external IDs and 36 source Clerk avatar URLs. No create-user
  API calls were initially made by preparation alone. The subsequent executable
  import completed at `2026-10-04T21:22:42Z`: 100 target accounts, 21 password-enabled
  accounts, 53 preserved native external IDs and all 36 source avatars uploaded to
  new target image URLs. Primary/verified identifiers, native IDs, names, timezone,
  metadata, restrictions and migration markers were checked against the fresh
  source snapshot before and after import. Production webhook endpoints were
  confirmed empty in the dashboard before any import writes.
- The exact 100-account map was applied to a full production backup restored in a
  network-isolated Supabase PostgreSQL 17 container. Default rollback, committed
  forward migration, idempotent retry and reverse rollback all passed. Row counts
  and hashes for all 96 public tables (excluding only `UserProfile.clerkUserId`)
  stayed identical. All 27 unmapped profiles were untouched. The container was
  removed; this did not execute migration SQL against production.
- Production SSO connections still show `Setup required` for Google and Apple.
  Among three source web-Apple users, one uses a private relay email and does not
  have a native `apple:` binding. Native login alone is not adequate evidence that
  this person's existing account will remain accessible after cutover. The source
  dashboard confirms both providers use shared Development credentials. For the
  relay-only Apple account, changing Apple developer credentials may change the
  provider subject and relay address. Resolve this with an authenticated account
  linking/recovery path and an actual login test; never guess by display name or
  treat a newly supplied email address as proof of ownership.
- Production Supabase's Third-Party Auth page currently has no providers. Adding
  the Production Clerk issuer and enabling the corresponding Clerk integration
  requires confirmation; the form is open but has not been submitted. Private
  drawing Realtime uses the ordinary Clerk session token, not a legacy Supabase
  JWT template. Existing public revision broadcasts are not proof of private
  channel authorization.
- Production environment inventory has no `ADMIN_CLERK_USER_IDS`, `ADMIN_EMAILS`
  or Clerk webhook signing secret. Preserve database roles and copied metadata;
  do not assume a webhook endpoint is configured just because its route exists.

The user explicitly approved saving the existing Production key locally and
adding the five Clerk CNAMEs. DNS setup is complete; do not ask for the same
authorization again or create duplicate records.

| DNS-only CNAME               | Target                              |
| ---------------------------- | ----------------------------------- |
| `clerk.friemi.com`           | `frontend-api.clerk.services`       |
| `accounts.friemi.com`        | `accounts.clerk.services`           |
| `clkmail.friemi.com`         | `mail.o3nd9g81xzvg.clerk.services`  |
| `clk._domainkey.friemi.com`  | `dkim1.o3nd9g81xzvg.clerk.services` |
| `clk2._domainkey.friemi.com` | `dkim2.o3nd9g81xzvg.clerk.services` |

All five have Auto TTL and resolve correctly. Cloudflare now has nine records;
the original apex, www and two Vercel verification records were left unchanged.
Clerk reports Frontend API Verified, Account portal Verified and Email 3/3
Verified. SSL certificates now show Issued. The public
`https://clerk.friemi.com/.well-known/jwks.json` returned HTTP 200 with one public
key and normal TLS verification. The account portal had valid TLS but still
returned Cloudflare HTTP 403 (`DNS points to prohibited IP`) during provisioning.
Do not interpret DNS verification as a successful account-portal/login test;
recheck provider provisioning before cutover, without disabling TLS checks or
changing the approved DNS-only targets to work around the error.

The user saved the existing Production secret in the private `target-clerk.env`
file (`0600`). Backend API `/instance` and domain checks verified the exact target
instance, Production environment and `clerk.friemi.com` domain. The former local
receiver was removed without bypassing Chrome's restriction. No key was logged or
committed. Google web OAuth and Apple Developer configuration remain release gates.

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
- [x] Verify key-to-instance identity and user count for both instances. A key
      prefix (`sk_test_` / `sk_live_`) by itself is not sufficient.
- [x] Take a fresh production dump; verify `pg_restore --list` and test recovery
      in an isolated database. Do not rely on a dump made before other live changes.
- [x] Add Clerk's five CNAMEs as DNS-only, leaving apex/www/Vercel records alone.
      Complete DNS verification in Clerk.
- [x] Verify TLS certificates have finished issuing for both Clerk subdomains.
- [ ] Resolve the Account Portal's HTTP 403 and verify actual sign-in rendering.
- [ ] Configure Google Production web OAuth with matching consent/redirect URLs;
      preserve the existing iOS OAuth client. Test actual Google account linking.
- [ ] Verify native Apple sign-in and existing relay-email users. The Apple
      Developer account is held by another programmer: web Apple Services ID, key,
      Team ID and relay sender configuration require that person's cooperation.
      Do not assume email fallback preserves access for every Apple user.
- [ ] Match all enabled login methods, signup restrictions, metadata, administrator
      access and redirect allowlists. Handle MFA/passkeys or other unsupported factors
      separately; do not silently remove them.
- [x] Import users into Production idempotently, preserving password hashes,
      primary/verified identifiers, native external IDs and ban/lock states. Recover
      interrupted imports using exact migration markers, not email-only matching.
      Keep Production webhook delivery disabled during import to avoid duplicate
      `UserProfile` rows and welcome rewards.
- [x] Compare imported accounts and uploaded avatars against the fresh source.
- [ ] Password-enabled flags are only a sanity check, not proof that a password
      works. Test a consenting test account
      with its original password and test native/web OAuth on real devices.
- [ ] Inspect actual database policies and column types before updating any
      non-Prisma auth references. The private drawing Realtime policy compares JWT
      `sub` with `UserProfile.clerkUserId`. Configure Supabase to trust the Production
      Clerk issuer and ensure `role: authenticated`; test private Realtime access.
- [ ] Inventory `ADMIN_CLERK_USER_IDS`, webhooks, signing secrets, mobile embedded
      keys and any other user-ID allowlists. Do not copy Development secrets to live.
- [x] Rehearse mapping and rollback on an isolated full production restore.
- [ ] Run the generated SQL with its default `ROLLBACK` on production as a final
      check during controlled cutover, not while login/profile writes are active.
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

Historical profiles can be explicitly preserved with `--preserved-history` and
`--historical-instance`. The private evidence envelope includes the complete
historical `instanceId`, `totalCount`, `users`, the expected `projectRef`,
`sourceInstanceId`, `targetInstanceId`, and exact `preservedProfiles` rows
(`id`, `clerkUserId`, `status`). This is a preserve-only exception, never a mapping
authority. Current source accounts, changed bindings/statuses, incomplete exports,
duplicate rows and mismatched scopes are rejected. Unlisted missing users still
block the plan. The evidence SHA-256 is saved in the plan for audit traceability.

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

## Executable Import And Rehearsal

`execute-import.mjs` defaults to read-only dry run. Actual import requires
`--apply --webhooks-confirmed-empty`. It authenticates both instance identities,
checks source drift, rejects unrelated target accounts and matches exact private
markers for resumption. A private manifest, exclusive lock, per-account journal
and verified target snapshots support recovery. It never automatically retries an
ambiguous create call. Avatar requests cannot include the Clerk API credential.

```bash
node scripts/clerk-migration/execute-import.mjs \
  --batch /private/import-batch.json --source /private/source-users-api.json \
  --source-env /private/source.env --target-env /private/target.env \
  --output /private/import-run --limit 1
```

`rehearse-restore.mjs` restores an explicit archive into its own disposable Docker
container with `--network none`, no exposed ports and temporary storage. It uses
the installed official Supabase PostgreSQL image, waits for bootstrap completion,
then tests the actual map and reverse map. Only this isolated copy uses COMMIT.

```bash
node scripts/clerk-migration/rehearse-restore.mjs \
  --archive /private/production.dump --plan /private/plan.json \
  --database /private/profiles.json --report /private/rehearsal.json
```

Validation completed: 97 unit tests and one real local PostgreSQL integration test
(98 passing), plus the separate full-production-dump restore and real 100-account
mapping rehearsal. No password/OAuth end-to-end login test or production database
identity write has been performed. Refresh source data again before cutover;
password changes need a fresh CSV export, not a forced reuse of the old hash.

## OAuth Handoff

The Google Cloud `friemi` project currently has only the existing Friemi iOS
client. Do not change or delete that client. A separate Web client must use
`https://clerk.friemi.com/v1/oauth_callback`, with HTTPS origins for `friemi.com`
and `www.friemi.com`, and only basic OpenID/email/profile scopes. Its consent
configuration is incomplete and its audience is still Testing. Creation and
credential transmission to Clerk are awaiting user confirmation; nothing has
been submitted. Never leave the production release dependent on a test-user cap.

The programmer who owns the existing Apple Developer team must configure the
same app's Sign in with Apple capability and provide Services ID, Team ID, Key ID
and its authorized private key securely, not through chat or Git. The exact
Production dashboard values are:

- Domain: `clerk.friemi.com`.
- Return URL: `https://clerk.friemi.com/v1/oauth_callback`.
- Private Relay email source: `bounces+110056354@clkmail.friemi.com`.
- Existing native bundle: `com.friemi.app`; do not create a replacement app or
  change developer team as part of this task.

Registering a new relay sender does not prove old shared-credential relay
addresses can receive mail. Verify the identified relay-only account separately
before releasing, using authenticated ownership evidence rather than email/name
matching. Keep the Development instance intact until these checks pass.

## References

- [Clerk migration overview](https://clerk.com/docs/guides/development/migrating/overview)
- [Clerk migration tool](https://github.com/clerk/migration-tool)
- [Create user API](https://clerk.com/docs/reference/backend/user/create-user)
- [Production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk integration with Supabase](https://supabase.com/docs/guides/auth/third-party/clerk)
