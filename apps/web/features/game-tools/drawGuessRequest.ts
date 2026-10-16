import { DRAW_GUESS_REQUEST_TIMEOUT_MS } from "./drawGuessPresenceTiming";
import { fetchGameToolResponse } from "./gameToolRequest";

/** Bound the complete request, including response-body parsing. */
export async function fetchDrawGuessResponse<T>(
  url: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DRAW_GUESS_REQUEST_TIMEOUT_MS,
): Promise<{ response: Response; data: T | null }> {
  return fetchGameToolResponse<T>(url, init, timeoutMs, "DRAW_GUESS_REQUEST_TIMEOUT");
}
