import {
  getAuthRedirectFallback,
  normalizeAuthRedirectTarget,
} from "../../lib/auth-redirect";

export const androidAuthStorageKey = "friemi:android-auth:v1";
export const androidAuthMaxAgeMs = 10 * 60 * 1000;
export const androidAuthProofPattern = /^[A-Za-z0-9_-]{43}$/;
export const androidAuthFlowPattern = /^[a-f0-9]{32}$/;

export type AndroidAuthAttempt = {
  flow: string;
  verifier: string;
  target: string;
  createdAt: number;
};

export function readAndroidAuthAttempt(
  raw: string | null,
  flow: string,
  now = Date.now(),
): AndroidAuthAttempt | null {
  try {
    const value = JSON.parse(raw ?? "null") as AndroidAuthAttempt | null;
    if (
      !value ||
      value.flow !== flow ||
      !androidAuthFlowPattern.test(value.flow) ||
      !androidAuthProofPattern.test(value.verifier) ||
      typeof value.target !== "string" ||
      !Number.isFinite(value.createdAt) ||
      value.createdAt > now ||
      now - value.createdAt >= androidAuthMaxAgeMs
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export function isAndroidAuthReturnPath(pathname: string) {
  return /^\/(?:zh-CN|en|fr)\/android-auth-return\/?$/.test(pathname);
}

export function normalizeAndroidAuthTarget(locale: string, target?: string) {
  const normalized = normalizeAuthRedirectTarget(locale, target);
  const path = new URL(normalized, "https://friemi.local").pathname;
  return /^\/(?:zh-CN|en|fr)\/android-auth-(?:browser|return|complete)(?:\/|$)/.test(
    path,
  )
    ? getAuthRedirectFallback(locale)
    : normalized;
}

export function getAndroidAccountPortalUrl(
  publishableKey: string,
  mode: "sign-in" | "sign-up",
) {
  const encoded = publishableKey.match(
    /^pk_(?:live|test)_([A-Za-z0-9+/=_-]+)$/,
  )?.[1];
  if (!encoded) throw new Error("INVALID_CLERK_CONFIGURATION");
  const frontendHost = atob(
    encoded.replace(/-/g, "+").replace(/_/g, "/"),
  ).replace(/\$$/, "");
  if (!/^[a-z0-9.-]+$/.test(frontendHost))
    throw new Error("INVALID_CLERK_CONFIGURATION");
  const portalHost = frontendHost.endsWith(".clerk.accounts.dev")
    ? frontendHost.replace(/\.clerk\.accounts\.dev$/, ".accounts.dev")
    : frontendHost.startsWith("clerk.")
      ? `accounts.${frontendHost.slice(6)}`
      : null;
  if (!portalHost) throw new Error("INVALID_CLERK_CONFIGURATION");
  return new URL(`https://${portalHost}/${mode}`);
}
