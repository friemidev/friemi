/** Bound both the transport and body parsing, even if either ignores abort. */
export async function fetchGameToolResponse<T>(
  url: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 10_000,
  timeoutCode = "GAME_TOOL_REQUEST_TIMEOUT",
): Promise<{ response: Response; data: T | null }> {
  const externalSignal = init?.signal;
  const abortReason = () => externalSignal?.reason ?? new DOMException("The request was aborted", "AbortError");
  if (externalSignal?.aborted) throw abortReason();

  const controller = new AbortController();
  let cancel!: (reason: unknown) => void;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = (reason) => {
      reject(reason);
      controller.abort(reason);
    };
  });
  const onAbort = () => cancel(abortReason());
  externalSignal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => cancel(new Error(timeoutCode)), timeoutMs);
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
