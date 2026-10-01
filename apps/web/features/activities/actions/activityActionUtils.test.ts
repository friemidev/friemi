import assert from "node:assert/strict";
import test from "node:test";
import { getActivityFormValues } from "./activityActionUtils";

test("activity form values retain unique planet associations", () => {
  const formData = new FormData();
  formData.append("planetIds", "planet-one");
  formData.append("planetIds", "planet-two");
  formData.append("planetIds", "planet-one");
  formData.append("planetIds", "  ");

  const values = getActivityFormValues(formData);

  assert.deepEqual(values.planetIds, ["planet-one", "planet-two"]);
});
