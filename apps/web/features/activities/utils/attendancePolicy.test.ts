import assert from "node:assert/strict";
import { test } from "node:test";
import { partitionActivityAttendance } from "./attendancePolicy";

test("attendance defaults every approved participant to present", () => {
  assert.deepEqual(
    partitionActivityAttendance({
      absentParticipationIds: [],
      participantIds: ["participant-a", "participant-b"],
    }),
    {
      absentIds: [],
      presentIds: ["participant-a", "participant-b"],
    },
  );
});

test("attendance only marks explicitly selected participants absent", () => {
  assert.deepEqual(
    partitionActivityAttendance({
      absentParticipationIds: ["participant-b", "unknown", "participant-b"],
      participantIds: ["participant-a", "participant-b", "participant-c"],
    }),
    {
      absentIds: ["participant-b"],
      presentIds: ["participant-a", "participant-c"],
    },
  );
});
