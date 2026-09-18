"use client";

import { useState } from "react";
import { ChevronDown, Settings2, Share2 } from "lucide-react";
import { getPollCopy } from "../copy";
import type { ActivityPollViewData } from "../server/pollService";
import { PollManagerControls } from "./PollManagerControls";
import { PollSharePanel } from "./PollSharePanel";

type OpenTool = "share" | "manage" | null;

export function PollOwnerTools({
  locale,
  poll,
}: {
  locale: string;
  poll: ActivityPollViewData;
}) {
  const copy = getPollCopy(locale);
  const [openTool, setOpenTool] = useState<OpenTool>(null);
  const tools = [
    { id: "share" as const, icon: Share2, label: copy.shareTitle },
    { id: "manage" as const, icon: Settings2, label: copy.manage },
  ];

  return (
    <section className="border-t border-[#E8E5D8] pt-2">
      <div className="grid grid-cols-2 divide-x divide-[#E8E5D8]">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const expanded = openTool === tool.id;

          return (
            <button
              aria-controls={`poll-${tool.id}-panel`}
              aria-expanded={expanded}
              className={`group flex min-h-16 flex-col items-center justify-center gap-1 px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#369758] ${
                expanded
                  ? "bg-[#F2F8F3] text-[#156240]"
                  : "text-[#607268] hover:bg-[#F7F9F4] hover:text-[#156240]"
              }`}
              key={tool.id}
              onClick={() => setOpenTool(expanded ? null : tool.id)}
              type="button"
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="flex items-center gap-1">
                {tool.label}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      {openTool ? (
        <div
          className="border-t border-[#E8E5D8] px-1 pb-2 pt-5"
          id={`poll-${openTool}-panel`}
        >
          {openTool === "share" ? (
            <PollSharePanel
              initialAudience={poll.share?.audience ?? "MEMBERS_ONLY"}
              locale={locale}
              pollId={poll.id}
              shareActive={poll.share?.active ?? false}
            />
          ) : (
            <PollManagerControls locale={locale} poll={poll} />
          )}
        </div>
      ) : null}
    </section>
  );
}
