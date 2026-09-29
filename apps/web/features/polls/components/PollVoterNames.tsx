"use client";

import { useEffect, useRef, useState } from "react";
import { getCollapsedVoterNameCount } from "../voterNames";

export function PollVoterNames({
  collapseLabel,
  expandLabel,
  voters,
}: {
  collapseLabel: string;
  expandLabel: string;
  voters: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(
    Math.min(1, voters.length),
  );
  const voterKey = voters.join("\u0000");

  useEffect(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;

    if (!container || !measurement) return;

    const updateVisibleCount = () => {
      const voterWidths = Array.from(
        measurement.querySelectorAll<HTMLElement>("[data-voter-name]"),
        (element) => element.getBoundingClientRect().width,
      );
      const moreWidths = Array.from<number>({ length: voters.length }).fill(0);

      for (const element of measurement.querySelectorAll<HTMLElement>(
        "[data-hidden-count]",
      )) {
        const hiddenCount = Number(element.dataset.hiddenCount);

        if (Number.isInteger(hiddenCount)) {
          moreWidths[hiddenCount] = element.getBoundingClientRect().width;
        }
      }

      setVisibleCount(
        getCollapsedVoterNameCount({
          availableWidth: container.getBoundingClientRect().width,
          moreWidths,
          voterWidths,
        }),
      );
    };

    updateVisibleCount();
    const resizeObserver = new ResizeObserver(updateVisibleCount);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [voterKey, voters.length]);

  const hiddenCount = Math.max(0, voters.length - visibleCount);

  return (
    <div
      className="relative min-w-0 text-[11px] leading-5 text-[#6E756F]"
      ref={containerRef}
    >
      {expanded ? (
        <div className="break-words">
          <span>{voters.join(" · ")}</span>
          <button
            aria-expanded="true"
            className="ml-1 inline-flex rounded-full bg-[#E8F3EA] px-2 py-0.5 text-[10px] font-black leading-4 text-[#156240] transition hover:bg-[#DCEEDF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35"
            onClick={() => setExpanded(false)}
            type="button"
          >
            {collapseLabel}
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 items-center whitespace-nowrap">
          <span className="min-w-0 truncate">
            {voters.slice(0, visibleCount).join(" · ")}
          </span>
          {hiddenCount > 0 ? (
            <button
              aria-expanded="false"
              aria-label={`${expandLabel}（${hiddenCount}）`}
              className="ml-1 inline-flex shrink-0 rounded-full bg-[#E8F3EA] px-1.5 py-0.5 text-[10px] font-black leading-4 text-[#156240] transition hover:bg-[#DCEEDF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35"
              onClick={() => setExpanded(true)}
              title={expandLabel}
              type="button"
            >
              +{hiddenCount}
            </button>
          ) : null}
        </div>
      )}

      <div
        aria-hidden="true"
        className="invisible fixed left-0 top-0 -z-10 flex whitespace-nowrap text-[11px] leading-5"
        ref={measurementRef}
      >
        {voters.map((voter, index) => (
          <span data-voter-name key={`${voter}-${index}`}>
            {index > 0 ? " · " : ""}
            {voter}
          </span>
        ))}
        {voters.slice(1).map((_, index) => {
          const hidden = index + 1;

          return (
            <span
              className="inline-flex pl-1"
              data-hidden-count={hidden}
              key={hidden}
            >
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black leading-4">
                +{hidden}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
