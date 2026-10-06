export function isChatConversationPath(pathname: string) {
  const path = pathname
    .replace(/^\/(zh-CN|en|fr)(?=\/|$)/, "")
    .replace(/\/$/, "");

  return (
    /^\/messages\/[^/]+$/.test(path) ||
    /^\/lobby\/[^/]+\/room$/.test(path) ||
    /^\/planets\/[^/]+\/chat$/.test(path)
  );
}
