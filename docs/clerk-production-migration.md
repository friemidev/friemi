# Clerk Production Migration

## Status (2026-10-05)

The user-authorized Production cutover is complete. All 100 imported accounts
are bound to their original production business profiles, and the website uses
the verified Production Clerk key pair. All 127 profiles remain; the other 27
bindings were preserved. Preview still uses Development Clerk and was not remapped.
Existing Google-session application access and private Realtime delivery passed.
Fresh phone/browser re-login confirmation, original-password testing and deferred
Apple configuration remain separate follow-ups; do not claim those are verified.

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

Before cutover, Vercel's Production and Preview shared keys pointing to
`simple-ewe-14.clerk.accounts.dev`. They now have separate environment-scoped
entries: Production uses `clerk.friemi.com`, Preview retains the source keys.
The local `apps/web/.env` points to
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
- Google Production SSO now shows `Enabled` / `Used for sign-in` after the user
  supplied credentials on October 5. Its client ID matches the new `Friemi Web`
  Web application in the Google Cloud `friemi` project. With explicit user
  confirmation, the missing JavaScript origins (`https://friemi.com` and
  `https://www.friemi.com`) and redirect URI
  (`https://clerk.friemi.com/v1/oauth_callback`) were added and saved. The console
  displayed its saved confirmation, and reopening the client verified all three
  values. The existing Friemi iOS client was not modified. No secret was printed,
  copied to Git or rotated. One existing Google user subsequently signed in to
  Production and linked to the exact imported account; see the isolated-login
  result below. That existing session now passes the live application checks
  recorded under Controlled Cutover; a fresh interactive re-login is still pending.
- Apple Production SSO still shows `Setup required`.
  Among three source web-Apple users, one uses a private relay email and does not
  have a native `apple:` binding. Native login alone is not adequate evidence that
  this person's existing account will remain accessible after cutover. The source
  dashboard confirms both providers use shared Development credentials. For the
  relay-only Apple account, changing Apple developer credentials may change the
  provider subject and relay address. Resolve this with an authenticated account
  linking/recovery path and an actual login test; never guess by display name or
  treat a newly supplied email address as proof of ownership.
- Production Supabase's Third-Party Auth page now has one enabled Clerk provider,
  `https://clerk.friemi.com`. The user enabled the Production Clerk Supabase
  integration and created this connection; both dashboard states were verified.
  A refreshed token from the existing Google session was independently checked:
  issuer `https://clerk.friemi.com`, `role: authenticated`, and the exact mapped
  Production subject. Private
  drawing Realtime uses the ordinary Clerk session token, not a legacy Supabase
  JWT template. Existing public revision broadcasts are not proof of private
  channel authorization.
- Production environment inventory has no `ADMIN_CLERK_USER_IDS`, `ADMIN_EMAILS`
  or Clerk webhook signing secret. Preserve database roles and copied metadata;
  do not assume a webhook endpoint is configured just because its route exists.
- The October 5 Realtime preflight found 96 public tables with RLS disabled and
  SELECT/INSERT/UPDATE/DELETE privileges for both `anon` and `authenticated`.
  A publishable-key-only HEAD request for zero UserProfile rows returned HTTP 200;
  no user content was fetched. The user subsequently disabled Production Data API;
  the same zero-row HEAD request now returns HTTP 503 instead of 200. The underlying
  table grants were not changed: do not re-enable Data API without an access-control
  review. See the security gate and verification results below.

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
On October 5, the command-line `/sign-in` check still returned HTTP 403 while the
Frontend API JWKS returned HTTP 200. A subsequent real Chrome check successfully
rendered `Sign in to Friemi`, Google/Apple buttons and the email input at the exact
Production portal URL. Browser rendering is verified; do not treat the CLI-only
403 as proof the portal is unavailable to users or disable security to bypass it.
The precise reason for the CLI/browser difference has not been diagnosed.

The user saved the existing Production secret in the private `target-clerk.env`
file (`0600`). Backend API `/instance` and domain checks verified the exact target
instance, Production environment and `clerk.friemi.com` domain. The former local
receiver was removed without bypassing Chrome's restriction. No key was logged or
committed. Google web OAuth was configured and tested. Apple Developer
configuration remains deferred by the user, with the access risks described above.

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
local links were not changed. Initial downloads were read-only; the subsequent
authorized Production updates are recorded below.

## Controlled Cutover (2026-10-05)

- Confirmed the current live commit was
  `30f9a4c6f20353f237c4f55d6ec3a53b20f21de9`, including the latest policy fixes.
  Rebuilt that exact main commit, not this migration worktree. No Git branch was
  pushed. The new Production deployment is
  `dpl_BSS6oAAycPT8GBWCoRpYswSbjqPF` (`friemi-ga2bspozi-friemi.vercel.app`).
- A project WAF rule gated Production requests, including immutable deployment
  URLs; Preview was verified unaffected. A random private verification header
  exempted only migration smoke requests. Requests were drained for over five
  minutes before the mapping transaction. Website maintenance began at 11:20 UTC;
  normal access resumed at approximately 11:30 UTC. The header exception was removed.
- Took a fresh 10,219,292-byte Production dump. Restored it into an isolated,
  network-disabled PostgreSQL 17 container and repeated forward, retry and reverse
  mapping tests. All 96 public-table business hashes were unchanged in rehearsal.
- Re-read both 100-user Clerk instances and all 127 production profiles. The
  planner found zero blockers. Split the shared Vercel Clerk variables into
  Preview-only existing keys and Production-only new keys; downloaded both
  environments again and verified their exact values without logging secrets.
  Production database settings were unchanged.
- Applied guarded transactional mapping at `2026-10-05T11:25:55Z`: 100 exact
  bindings updated, 27 untouched, 127 total profiles. A hash of every live profile
  field except `clerkUserId` was identical before and after the transaction.
  No business schema, profile ID, role, balance or relationship was changed.
- Used the existing, user-completed Google login session, not a newly fabricated
  user/session. Production `/api/navigation/unread-counts` returned 200 with its
  refreshed session JWT and 401 anonymously. The production HTML contains the
  live public key and `clerk.friemi.com`, with no middleware invocation failure.
- In a disposable private drawing room, the same mapped user was denied before
  membership was added, then two authenticated connections subscribed. Anonymous
  and wrong-turn connections were denied. Database `realtime.send` reached both
  connections; direct client publishing was denied. The real production `/ink`
  endpoint returned 200 and its message reached both connections. All three
  temporary room/member/seat rows were removed, and clients disconnected.
- Final checks: official homepage 200, apex redirect 308, current deployment 200,
  retired production deployment 403, dev homepage 200, zero-row Data API probe
  still denied with 503, and 127 profiles. Data API remains disabled.

Private artifacts under the previously documented private directory include
`cutover-backup.json`, `cutover-restore-rehearsal.json`, `cutover-forward.sql`,
`cutover-rollback.sql`, `cutover-map-verification.json`,
`cutover-private-realtime-verification.json`, `cutover-final-http-verification.json`
and the before/after Vercel configuration snapshots. Do not commit those files.

The retained WAF rule blocks Production hostnames other than the official aliases
and verified new immutable deployment URL. This prevents old deployments, which
still embed Development keys, from recreating old-ID profiles. Preview is not
matched. Future production aliases continue to work; add a newly verified immutable
deployment hostname to this rule if direct deployment-URL testing is required.
Do not simply disable this rule while retired deployments remain accessible.

Rollback must first restore the Production maintenance gate and drain requests.
Reconcile any post-cutover registrations/profile changes; do not blindly run a
stale reverse map or replace the entire live database with the old dump. Restore
the original bindings with the guarded reverse SQL, matching Production keys and
the previous deployment together. Verify access before restoring traffic. Keep
Preview's separate environment entries and preserve unrelated firewall changes.
The source Clerk users and private backups have not been deleted.

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
- [x] Verify actual Production sign-in rendering in a real browser. The separate
      command-line 403 persists; do not confuse it with a failed browser login.
- [x] Configure Google Production web OAuth with matching consent/redirect URLs;
      preserve the existing iOS OAuth client. Verify one existing user's Google
      account links to its exact imported Production user. This does not prove
      end-to-end application access before the coordinated cutover.
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
- [x] Inspect actual database policies and column types before updating any
      non-Prisma auth references. The private drawing Realtime policy compares JWT
      `sub` with `UserProfile.clerkUserId`. Configure Supabase to trust the Production
      Clerk issuer and ensure `role: authenticated`; test private Realtime access.
- [x] Close the pre-existing public Data API exposure. The reviewed application
      uses Prisma for business data and separate Storage/Realtime APIs; only an
      operational probe uses `/rest/v1`. The user disabled Data API after being
      informed of the external-client impact. Verified denial of the zero-row
      anonymous request, public Storage object availability and Realtime continuity.
      Do not broadly change business-table policies or erase existing grants as
      an unreviewed migration shortcut.
- [ ] Inventory `ADMIN_CLERK_USER_IDS`, webhooks, signing secrets, mobile embedded
      keys and any other user-ID allowlists. Do not copy Development secrets to live.
- [x] Rehearse mapping and rollback on an isolated full production restore.
- [ ] Run the generated SQL with its default `ROLLBACK` on production as a final
      check during controlled cutover, not while login/profile writes are active.
- [x] Arrange a short controlled cutover. Stop signups, profile writes and old/new
      webhook delivery, drain in-flight requests and reconcile source changes since
      export. Take a final snapshot. Old deployments must not write old Clerk IDs
      after remapping, or the current profile upsert code can create duplicates.
- [x] Apply mapping and deploy matching Production keys and issuer, then reopen
      traffic only after smoke tests. No webhook signing secret was configured
      before migration; none was invented or activated during cutover.
      A rolling key-only deployment without gating writes is unsafe.
- [ ] Verify old user profile IDs, balances, chats, join history and native login;
      test a new signup. Compare profile counts and business-table integrity.
- [x] Keep the original instance and private audit artifacts for rollback. Do not
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
mapping rehearsal. Google account linking has been verified for one imported user;
password and end-to-end application login are still unverified. No production
database identity write has been performed. Refresh source data again before cutover;
password changes need a fresh CSV export, not a forced reuse of the old hash.

## OAuth Handoff

The Google Cloud `friemi` project now has both `Friemi iOS` and `Friemi Web`.
The latter client is `114440097515-j62s3ve9g86niafhf9esromau2u7vpr7.apps.googleusercontent.com`.
The user entered its credentials into Clerk Production. The authorized origins
and callback described above were then saved by this task with user approval.
The enabled Clerk connection requests only basic OpenID/email/profile scopes.
Do not change or delete the existing iOS client.

With a second explicit user confirmation, the existing Friemi name and support
email were retained, homepage `https://www.friemi.com` and privacy policy
`https://www.friemi.com/en/privacy` were saved, and Google OAuth was published.
The audience page now shows Production / External with an option to return to
Testing. The public privacy URL was checked and returned HTTP 200 with the
expected policy title. A user-added logo appeared during this work and was
preserved; no replacement logo or invented terms link was added.

Google's verification center says the brand is not yet displayed to users and
offers brand verification. Data access explicitly requires no verification
because no sensitive or restricted scopes are requested. Brand review has not
been submitted. Do not conflate the generic Google user-cap banner with Clerk
Development's 100-account cap; basic OpenID/email/profile requests have a documented
exception. One existing user's sign-in and account linking were subsequently
verified as described below; the full application flow still needs cutover testing.

The Production account portal successfully rendered in Chrome on October 5.
The user was asked to sign in there with a previously used Friemi Google account,
not a new test identity. No account was selected or consent granted on the user's
behalf. A fresh importer dry run still verified all 100 imported accounts with
zero pending imports and no writes. Vercel keys and live database bindings remain
unchanged by this task.

### Google Login Result And Environment Isolation

The user selected their existing Google account on October 5. Production Clerk
issued a session, but redirected to the still-Development-configured website.
Vercel logged `jwk-kid-mismatch`: the handshake used the Production instance key
while middleware expected the Development instance key, resulting in
`MIDDLEWARE_INVOCATION_FAILED`. Do not bypass signature checks or change only one
key to hide this mismatch. Testing the new account portal against the old live
website was insufficiently isolated and must not be repeated before cutover.

Read-only Backend API checks at `2026-10-05T08:23:08Z` confirmed 100 target users,
zero new or removed accounts, unchanged source markers/primary emails/native
external IDs, and one successful Google-linked sign-in to an imported account.
A production database read at `2026-10-05T08:23:49Z` still found the same 127
profiles with zero new/removed profiles and unchanged bindings/statuses. The
website rendered its homepage but showed a Login link; do not report this as a
successful application login. Private aggregate reports are stored outside Git.

### Realtime Security Gate

The user requested Production Supabase Realtime configuration and deferred Apple
setup on October 5. Deferral does not prove existing Apple-only users can log in;
keep that residual migration risk explicit without treating iOS usage as equivalent
to Apple sign-in usage.

The Production Third-Party Auth list was initially empty and the Production Clerk
Supabase integration switch was off. Both are now configured and verified below.
The existing `realtime.messages` table has RLS enabled:
private drawing broadcasts require `draw_guess_can_read_ink_topic()`, which checks
the active room, phase, deadline, seat, membership and exact Clerk subject. Client
writes to private drawing topics are restricted; retain these protections.

The separate Data API preflight found the public-table exposure recorded above.
Source inspection of this branch and the saved `origin/main` found business access
through Prisma, Realtime clients and Storage clients, but no runtime PostgREST or
GraphQL consumer. The operational drawing probe's REST check is not a business
dependency and must not be used after Data API is disabled. Supabase recommends
disabling Data API when database access uses direct server connections.

The user requested instructions, then reported completing all three settings.
Read-only dashboard verification confirmed Production Data API disabled and saved,
the exact Production Clerk Supabase switch enabled, and one enabled Third-Party
Auth connection for `https://clerk.friemi.com` in the Production Supabase project.
No Preview setting, live key, account binding or database policy was changed.

Operational verification at `2026-10-05T11:06:08Z`:

- The same publishable-key-only zero-row Data API HEAD request returned HTTP 503,
  consistent with the disabled Data API, not a failure of the database connection.
- A known public Storage image returned HTTP 200 and `image/png` to a HEAD request.
  This checks retrieval only, not a new upload.
- A read-only direct PostgreSQL connection succeeded: 127 profiles, zero new or
  removed profiles, and zero changed bindings/statuses against the post-import
  snapshot.
- An isolated random public Realtime topic subscribed successfully. The normal
  server Broadcast endpoint returned HTTP 202, and the subscriber received the
  matching random nonce. No real-room topic or user payload was used; all test
  channels were removed and the client disconnected afterward.
- An anonymous subscription to a random, nonexistent private drawing topic was
  rejected with an authorization error. No permissive policy was added for tests.

The aggregate report is stored privately as `supabase-integration-verification.json`.
Full private-channel positive-path testing still requires a valid Production
session and the coordinated identity mapping; do not relax RLS to make an unmapped
Production account pass. UI configuration and public transport success alone do
not prove that real users can receive private drawing events after cutover.

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
- [Google OAuth audience and basic-profile exception](https://support.google.com/cloud/answer/15549945)
- [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase direct-connection security](https://supabase.com/docs/guides/database/secure-data)
