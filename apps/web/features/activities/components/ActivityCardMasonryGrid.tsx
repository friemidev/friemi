"use client";

import {
  Children,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ActivityCardMasonryGridProps = {
  className?: string;
  children: ReactNode;
  gridClassName?: string;
  mobileColumnWeights?: number[];
};

function useMobileMasonryEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 380px) and (max-width: 639px)");
    const update = () => setEnabled(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return enabled;
}

function splitIntoBalancedMobileColumns(
  childItems: ReactNode[],
  weights: number[] = [],
) {
  const columns: [ReactNode[], ReactNode[]] = [[], []];
  const columnWeights: [number, number] = [0, 0];

  childItems.forEach((child, index) => {
    const targetColumn = columnWeights[0] <= columnWeights[1] ? 0 : 1;
    const weight = weights[index] ?? 1;

    columns[targetColumn].push(child);
    columnWeights[targetColumn] += weight;
  });

  return columns;
}

export function ActivityCardMasonryGrid({
  children,
  className,
  gridClassName,
  mobileColumnWeights,
}: ActivityCardMasonryGridProps) {
  const childItems = Children.toArray(children);
  const mobileMasonryEnabled = useMobileMasonryEnabled();
  const singleColumnOnMobile = childItems.length < 2;

  if (mobileMasonryEnabled && !singleColumnOnMobile) {
    const columns = splitIntoBalancedMobileColumns(
      childItems,
      mobileColumnWeights,
    );

    return (
      <div className={cn("grid grid-cols-2 items-start gap-3", className)}>
        {columns.map((columnItems, columnIndex) => (
          <div key={columnIndex} className="grid min-w-0 gap-3">
            {columnItems}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5",
        !singleColumnOnMobile ? "min-[380px]:grid-cols-2" : "sm:grid-cols-2",
        gridClassName,
        className,
      )}
    >
      {childItems}
    </div>
  );
}
