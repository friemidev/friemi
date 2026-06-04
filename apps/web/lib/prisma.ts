import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

type PublicEventFavoriteDelegate = {
  count: (...args: unknown[]) => Promise<number>;
  create: (...args: unknown[]) => Promise<unknown>;
  delete: (...args: unknown[]) => Promise<unknown>;
  findMany: (...args: unknown[]) => Promise<unknown[]>;
  findUnique: (...args: unknown[]) => Promise<unknown>;
};

export function getPublicEventFavoriteDelegate() {
  return (prisma as PrismaClient & {
    publicEventFavorite?: PublicEventFavoriteDelegate;
  }).publicEventFavorite;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
