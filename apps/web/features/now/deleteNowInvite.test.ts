import assert from "node:assert/strict";
import test from "node:test";
import { deleteNowInviteForOrganizer } from "./deleteNowInvite";

function createStore() {
  const invites = new Map([
    ["mine", { id: "mine", organizerId: "host" }],
    ["theirs", { id: "theirs", organizerId: "another-host" }],
  ]);
  const notifications = [
    { nowInviteId: "mine", recipientId: "host" },
    { nowInviteId: "mine", recipientId: "interested" },
    { nowInviteId: "mine", recipientId: "interested" },
    { nowInviteId: "theirs", recipientId: "another-host" },
  ];
  const mutations: string[] = [];
  const store = {
    nowInvite: {
      async findFirst({
        where,
      }: {
        where: { id: string; organizerId: string };
      }) {
        const invite = invites.get(where.id);
        if (!invite || invite.organizerId !== where.organizerId) return null;
        return {
          id: invite.id,
          notifications: notifications.filter(
            (item) => item.nowInviteId === invite.id,
          ),
          conversations: [{ id: "private-chat" }],
        };
      },
      async deleteMany({
        where,
      }: {
        where: { id: string; organizerId: string };
      }) {
        mutations.push("invite");
        const invite = invites.get(where.id);
        if (!invite || invite.organizerId !== where.organizerId)
          return { count: 0 };
        invites.delete(invite.id);
        return { count: 1 };
      },
    },
    notification: {
      async deleteMany({ where }: { where: { nowInviteId: string } }) {
        mutations.push("notifications");
        let count = 0;
        for (let index = notifications.length - 1; index >= 0; index -= 1) {
          if (notifications[index].nowInviteId !== where.nowInviteId) continue;
          notifications.splice(index, 1);
          count += 1;
        }
        return { count };
      },
    },
  };
  return {
    store: store as unknown as Parameters<
      typeof deleteNowInviteForOrganizer
    >[0],
    invites,
    notifications,
    mutations,
  };
}

test("the organizer can delete a NOW and its notifications without affecting other invites", async () => {
  const { store, invites, notifications, mutations } = createStore();
  const result = await deleteNowInviteForOrganizer(store, "mine", "host");

  assert.deepEqual(result, {
    recipientIds: ["host", "interested"],
    conversationIds: ["private-chat"],
  });
  assert.equal(invites.has("mine"), false);
  assert.equal(invites.has("theirs"), true);
  assert.deepEqual(notifications, [
    { nowInviteId: "theirs", recipientId: "another-host" },
  ]);
  assert.deepEqual(mutations, ["notifications", "invite"]);
});

test("interested people and other users cannot delete a NOW or its notifications", async () => {
  for (const profileId of ["interested", "stranger", "another-host"]) {
    const { store, invites, notifications, mutations } = createStore();
    assert.equal(
      await deleteNowInviteForOrganizer(store, "mine", profileId),
      null,
    );
    assert.equal(invites.size, 2);
    assert.equal(notifications.length, 4);
    assert.deepEqual(mutations, []);
  }
});

test("a missing or already deleted NOW does not delete any other content", async () => {
  const { store, invites, notifications } = createStore();
  assert.equal(
    await deleteNowInviteForOrganizer(store, "missing", "host"),
    null,
  );
  await deleteNowInviteForOrganizer(store, "mine", "host");
  assert.equal(await deleteNowInviteForOrganizer(store, "mine", "host"), null);
  assert.equal(invites.has("theirs"), true);
  assert.equal(notifications.length, 1);
});

test("a cleanup failure is surfaced before the invite is deleted", async () => {
  const { store, invites } = createStore();
  store.notification.deleteMany = (() => {
    throw new Error("database unavailable");
  }) as typeof store.notification.deleteMany;

  await assert.rejects(
    deleteNowInviteForOrganizer(store, "mine", "host"),
    /database unavailable/,
  );
  assert.equal(invites.has("mine"), true);
});
