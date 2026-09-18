import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createPollBearerToken() {
  return randomBytes(24).toString("base64url");
}

export function hashPollToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getPollGuestCookieName(pollId: string) {
  return `friemi_poll_${pollId}`;
}

export function createGuestDisplayCode() {
  return randomBytes(3).toString("hex").slice(0, 4).toUpperCase();
}
