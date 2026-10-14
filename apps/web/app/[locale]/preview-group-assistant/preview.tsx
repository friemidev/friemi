"use client";

import { ActivityRoomChatPage } from "@/features/activity-room-chat/components/ActivityRoomChatPage";
import { ActivityRoomWelcomeActionContext } from "@/features/activity-room-chat/components/ActivityRoomWelcomeEditor";
import { savePreviewWelcome } from "./actions";
import type { ComponentProps } from "react";

export function GroupAssistantPreview({
  data,
  role,
}: {
  data: ComponentProps<typeof ActivityRoomChatPage>;
  role: string;
}) {
  const labels =
    data.locale === "fr"
      ? ["Organisateur", "Admin", "Membre"]
      : data.locale === "en"
        ? ["Organizer", "Admin", "Member"]
        : ["群主", "管理员", "普通成员"];
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex min-h-12 shrink-0 items-center justify-center gap-2 border-b border-fog px-3">
        <select
          aria-label="身份"
          className="min-h-11 rounded-md border border-fog px-2 text-base"
          value={role}
          onChange={(event) =>
            window.location.assign(
              `/${data.locale}/preview-group-assistant?role=${event.target.value}`,
            )
          }
        >
          {["host", "admin", "member"].map((value, i) => (
            <option key={value} value={value}>
              {labels[i]}
            </option>
          ))}
        </select>
        <select
          aria-label="语言"
          className="min-h-11 rounded-md border border-fog px-2 text-base"
          value={data.locale}
          onChange={(event) =>
            window.location.assign(
              `/${event.target.value}/preview-group-assistant?role=${role}`,
            )
          }
        >
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>
      <div className="min-h-0 flex-1 [&_.mobile-chat-viewport]:!relative [&_.mobile-chat-viewport]:!top-0 [&_.mobile-chat-viewport]:!h-full">
        <ActivityRoomWelcomeActionContext.Provider
          value={savePreviewWelcome.bind(null, data.viewer!.id)}
        >
          <ActivityRoomChatPage
            {...data}
            messageEndpoint={`/${data.locale}/preview-group-assistant/messages/${role}`}
          />
        </ActivityRoomWelcomeActionContext.Provider>
      </div>
    </div>
  );
}
