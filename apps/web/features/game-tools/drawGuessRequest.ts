import { DRAW_GUESS_REQUEST_TIMEOUT_MS } from "./drawGuessPresenceTiming";

/** Bound the complete request, including response-body parsing. */
export async function fetchDrawGuessResponse<T>(
  url: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DRAW_GUESS_REQUEST_TIMEOUT_MS,
): Promise<{ response: Response; data: T | null }> {
  const externalSignal = init?.signal;
  const abortReason = () => externalSignal?.reason ?? new DOMException("The request was aborted", "AbortError");
  if (externalSignal?.aborted) throw abortReason();

  const controller = new AbortController();
  let cancel!: (reason: unknown) => void;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = (reason) => {
      // Some transports or body readers ignore AbortSignal. Settle the race
      // ourselves so they cannot keep the caller's mutation queue occupied.
      reject(reason);
      controller.abort(reason);
    };
  });
  const onAbort = () => cancel(abortReason());
  externalSignal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => cancel(new Error("DRAW_GUESS_REQUEST_TIMEOUT")), timeoutMs);

  try {
    const request = (async () => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const data = response.status === 304 ? null : await response.json() as T;
      return { response, data };
    })();
    return await Promise.race([request, cancelled]);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onAbort);
  }
}
