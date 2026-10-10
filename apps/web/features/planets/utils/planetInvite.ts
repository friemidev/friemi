import { withLocale } from "@/lib/routes";

export function getPlanetInvitePath(locale: string, inviteCode: string) {
  return withLocale(
    locale,
    `/planets/invite/${encodeURIComponent(inviteCode.trim().toUpperCase())}`,
  );
}
