import assert from "node:assert/strict";
import test from "node:test";
import { resolveTeamWechatShareImageUrl } from "./teamWechatShareImage";

test("uses a compact generated WeChat card when a team has no custom cover", () => {
  assert.equal(
    resolveTeamWechatShareImageUrl({
      activityId: "activity_1",
      activityUrl:
        "https://www.friemi.com/zh-CN/lobby/activity_1?access=private-token",
      locale: "zh-CN",
    }),
    "https://www.friemi.com/api/share/team-card?activityId=activity_1&locale=zh-CN&variant=wechat&access=private-token",
  );
});

test("uses the generated PNG card even when a team has a custom cover", () => {
  assert.equal(
    resolveTeamWechatShareImageUrl({
      activityId: "activity_1",
      activityUrl: "https://www.friemi.com/zh-CN/lobby/activity_1",
      locale: "zh-CN",
    }),
    "https://www.friemi.com/api/share/team-card?activityId=activity_1&locale=zh-CN&variant=wechat",
  );
});
