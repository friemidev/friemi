"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

/** Confirming an IME candidate must not also submit a guess or join a room. */
export function useDrawGuessCompositionGuard(contextKey: string) {
  const composing = useRef(false);
  useEffect(() => { composing.current = false; }, [contextKey]);
  return {
    canSubmit: () => !composing.current,
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: () => { composing.current = false; },
    onBlur: () => { composing.current = false; },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      // Safari can end composition before the confirmation keydown, while
      // keeping the legacy IME keyCode 229 on that event.
      const confirmsCandidate = event.key === "Enter" &&
        (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229);
      if (confirmsCandidate) event.preventDefault();
      return confirmsCandidate;
    },
  };
}
