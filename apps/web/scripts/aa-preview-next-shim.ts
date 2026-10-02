// The static audit preview never sends data to the Next.js server.
export function useRouter() { return { refresh() {} }; }
