"use client";

import { useEffect } from "react";
import {
  getDetailSourceTargetSelector,
  isDetailSourceReturnPage,
  readDetailSourceContext,
  type DetailSourceKind,
} from "@/features/navigation/contextualDetailReturn";

function scrollToTarget(targetKey: string, scrollY: number) {
  const target = document.querySelector<HTMLElement>(
    getDetailSourceTargetSelector(targetKey),
  );

  if (target) {
    target.scrollIntoView({
      block: "center",
      behavior: "auto",
    });
    target.classList.add("detail-source-restored");

    window.setTimeout(() => {
      target.classList.remove("detail-source-restored");
    }, 1600);
    return;
  }

  window.scrollTo({
    top: scrollY,
    behavior: "auto",
  });
}

export function DetailSourceRestore({
  sourceKey,
}: {
  sourceKey: DetailSourceKind;
}) {
  useEffect(() => {
    const context = readDetailSourceContext();

    if (!context || !isDetailSourceReturnPage(context, sourceKey)) {
      return;
    }

    const firstTimer = window.setTimeout(() => {
      scrollToTarget(context.targetKey, context.scrollY);
    }, 80);
    const secondTimer = window.setTimeout(() => {
      scrollToTarget(context.targetKey, context.scrollY);
    }, 420);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, [sourceKey]);

  return null;
}
