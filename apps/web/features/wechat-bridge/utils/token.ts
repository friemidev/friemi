import { createHash, randomBytes } from "node:crypto";

export function createPublicRegistrationToken() {
  return randomBytes(18).toString("base64url");
}

export function hashPublicRegistrationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashContactValue(value: string) {
  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, "");

  return normalizedValue
    ? createHash("sha256").update(normalizedValue).digest("hex")
    : null;
}
