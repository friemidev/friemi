import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { userInfo } from "node:os";
import { test } from "node:test";
import { buildSql } from "./plan.mjs";

test(
  "generated SQL rehearses, commits, retries, rolls back and fails atomically",
  {
    skip: process.env.CLERK_MIGRATION_LOCAL_SQL_TEST !== "1",
  },
  () => {
    const database = `friemi_clerk_test_${randomBytes(8).toString("hex")}`;
    // Explicit local socket and a generated database name prevent remote DB tests.
    const env = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith("PG")),
      ),
      PGHOST: "/var/run/postgresql",
      PGPORT: "5432",
      PGUSER: userInfo().username,
      PGDATABASE: database,
      PGPASSWORD: "",
      PGSERVICEFILE: "/dev/null",
      PGPASSFILE: "/dev/null",
    };
    const query = (input, databaseName = database) =>
      spawnSync("psql", ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
        input,
        encoding: "utf8",
        env: { ...env, PGDATABASE: databaseName },
      });
    const run = (input, name) => {
      const result = query(input, name);
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    const plan = {
      version: 1,
      projectRef: "abcdefghijklmnopqrst",
      profileCount: 3,
      blockers: [],
      mappings: [
        { profileId: "p1", oldClerkId: "user_old1", newClerkId: "user_new1" },
        { profileId: "p2", oldClerkId: "user_old2", newClerkId: "user_new2" },
      ],
    };
    const commit = { commit: true, maintenanceConfirmed: true };
    run(`CREATE DATABASE ${database}`, "postgres");
    try {
      run(`CREATE TABLE public."UserProfile" (
      id text PRIMARY KEY, "clerkUserId" text UNIQUE, status text,
      "friendCode" text, nickname text, balance int, "updatedAt" timestamp
    );
    INSERT INTO public."UserProfile" VALUES
      ('p1','user_old1','ACTIVE','100001','Original nickname',250,'2026-10-01'),
      ('p2','user_old2','ACTIVE','100002','Another nickname',300,'2026-10-02'),
      ('local','local-test','ACTIVE','100003','Local account',0,'2026-10-03');
    CREATE TABLE public.participation (id text PRIMARY KEY, profile_id text REFERENCES public."UserProfile"(id));
    INSERT INTO public.participation VALUES ('activity1','p1');`);
      const identities = () =>
        run(
          `SELECT string_agg(id || ':' || "clerkUserId", ',' ORDER BY id) FROM public."UserProfile"`,
        );
      const businessState = () =>
        run(`SELECT jsonb_agg(to_jsonb(p) - 'clerkUserId' ORDER BY id)::text FROM public."UserProfile" p;
      SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM public.participation p;`);
      const originalIdentities = identities();
      const originalBusinessState = businessState();
      run(buildSql(plan));
      assert.equal(identities(), originalIdentities, "dry run must roll back");
      run(buildSql(plan, commit));
      assert.equal(identities(), "local:local-test,p1:user_new1,p2:user_new2");
      assert.equal(
        businessState(),
        originalBusinessState,
        "business data and FKs must stay intact",
      );
      run(buildSql(plan, commit));
      assert.equal(
        businessState(),
        originalBusinessState,
        "retry must be idempotent",
      );
      run(buildSql(plan, { ...commit, rollback: true }));
      assert.equal(identities(), originalIdentities);

      run(
        `UPDATE public."UserProfile" SET "clerkUserId"='user_new1' WHERE id='local'`,
      );
      let result = query(buildSql(plan, commit));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Identity collision/);
      assert.equal(
        run(`SELECT "clerkUserId" FROM public."UserProfile" WHERE id='p2'`),
        "user_old2",
      );
      run(
        `UPDATE public."UserProfile" SET "clerkUserId"='local-test' WHERE id='local'`,
      );

      run(`UPDATE public."UserProfile" SET status='DELETED' WHERE id='p2'`);
      result = query(buildSql(plan, commit));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /profile was deleted/);
      assert.equal(
        run(`SELECT "clerkUserId" FROM public."UserProfile" WHERE id='p1'`),
        "user_old1",
      );
      run(`UPDATE public."UserProfile" SET status='ACTIVE' WHERE id='p2'`);

      run(
        `INSERT INTO public."UserProfile" (id,"clerkUserId",status) VALUES ('new','user_signup','ACTIVE')`,
      );
      result = query(buildSql(plan, commit));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Profile count changed/);
      assert.equal(
        run(`SELECT "clerkUserId" FROM public."UserProfile" WHERE id='p1'`),
        "user_old1",
      );
    } finally {
      run(`DROP DATABASE ${database}`, "postgres");
    }
  },
);
