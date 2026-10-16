import { fetchGameToolResponse } from "./gameToolRequest";

export function fetchDiceResponse<T>(url: RequestInfo | URL, init?: RequestInit, timeoutMs = 10_000) {
  return fetchGameToolResponse<T>(url, init, timeoutMs, "DICE_REQUEST_TIMEOUT");
}
