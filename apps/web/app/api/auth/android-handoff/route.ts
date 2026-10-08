import { auth, clerkClient } from "@clerk/nextjs/server";
import { handleAndroidHandoff } from "@/features/auth/androidAuthHandoffHandler";
import { getOptionalRedis } from "@/lib/redis";
import { getRedisRuntimeConfig } from "@/lib/redisConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAndroidHandoff(request, {
    getConfig: () => ({
      store: getOptionalRedis(),
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      prefix: getRedisRuntimeConfig().keyPrefix,
    }),
    getUserId: async () => (await auth()).userId,
    createTicket: async (userId) => {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      if (user.banned || user.locked) return null;
      const token = await clerk.signInTokens.createSignInToken({
        userId,
        expiresInSeconds: 30,
      });
      return token.token;
    },
  });
}
