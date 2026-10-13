export function canUseLocalGroupAssistantPreview() {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch {
    return false;
  }
}
