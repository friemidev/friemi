import assert from "node:assert/strict";
import test from "node:test";
import {
  isOfficialFeedbackAccount,
  officialFeedbackAccountEmail,
  createOfficialFeedback,
  getOfficialFeedbackInbox,
} from "./officialMessages";
import { prisma } from "@/lib/prisma";

test("official feedback inbox is restricted to the designated email", () => {
  assert.equal(
    isOfficialFeedbackAccount({ email: officialFeedbackAccountEmail }),
    true,
  );
  assert.equal(
    isOfficialFeedbackAccount({ email: " FRIEMI.DEV@GMAIL.COM " }),
    true,
  );
  assert.equal(
    isOfficialFeedbackAccount({ contactEmail: officialFeedbackAccountEmail }),
    false,
  );
  assert.equal(
    isOfficialFeedbackAccount({ email: "another-user@example.com" }),
    false,
  );
});

test("an editable contact email cannot impersonate the feedback operator", () => {
  assert.equal(
    isOfficialFeedbackAccount({
      email: "another-user@example.com",
      contactEmail: officialFeedbackAccountEmail,
    }),
    false,
  );
});

test("unauthorized accounts cannot read the stored feedback", async () => {
  let reads = 0;
  const db = {
    userProfile: {
      findUnique: async () => ({
        id: "other",
        email: "other@example.com",
        contactEmail: officialFeedbackAccountEmail,
      }),
    },
    officialFeedback: {
      findMany: async () => {
        reads++;
        return [];
      },
    },
  } as unknown as Pick<typeof prisma, "userProfile" | "officialFeedback">;
  assert.equal(await getOfficialFeedbackInbox("other", db), null);
  assert.equal(reads, 0);
});

test("feedback persists and notifies only the official login account", async (t) => {
  const cacheMode = process.env.REDIS_UNREAD_CACHE_MODE;
  process.env.REDIS_UNREAD_CACHE_MODE = "off";
  t.after(() => {
    if (cacheMode === undefined) delete process.env.REDIS_UNREAD_CACHE_MODE;
    else process.env.REDIS_UNREAD_CACHE_MODE = cacheMode;
  });
  const content = "[CHILD SAFETY / CSAE / CSAM]\\nHarmless submission test";
  const db = {
    officialFeedback: {
      create: async (args: unknown) => {
        assert.deepEqual(args, {
          data: { content, senderProfileId: "reporter" },
          select: { id: true },
        });
        return { id: "feedback-1" };
      },
    },
    userProfile: {
      findMany: async (args: unknown) => {
        assert.deepEqual(args, {
          where: {
            email: {
              equals: officialFeedbackAccountEmail,
              mode: "insensitive",
            },
            status: "ACTIVE",
          },
          select: { id: true },
        });
        return [{ id: "official" }];
      },
    },
  } as unknown as Pick<typeof prisma, "userProfile" | "officialFeedback">;
  assert.deepEqual(
    await createOfficialFeedback({ content, senderProfileId: "reporter" }, db),
    {
      id: "feedback-1",
      recipientProfileIds: ["official"],
    },
  );
});
