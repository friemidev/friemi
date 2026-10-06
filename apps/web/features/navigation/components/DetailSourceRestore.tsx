"use client";

import { useLayoutEffect } from "react";
import {
  isDetailSourceReturnPage,
  readDetailSourceContext,
  type DetailSourceKind,
} from "@/features/navigation/contextualDetailReturn";
import { restoreDetailScroll } from "@/features/navigation/restoreDetailScroll";

export function DetailSourceRestore({
  sourceKey,
}: {
  sourceKey: DetailSourceKind;
}) {
  useLayoutEffect(() => {
    const context = readDetailSourceContext();

    if (!context || !isDetailSourceReturnPage(context, sourceKey)) {
      return;
    }

    return restoreDetailScroll(context.scrollY);
  }, [sourceKey]);

  return null;
}
