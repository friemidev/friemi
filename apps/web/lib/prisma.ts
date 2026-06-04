import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

type PublicEventFavoriteDelegate = {
  count: (...args: any[]) => Promise<number>;
  create: (...args: any[]) => Promise<unknown>;
  delete: (...args: any[]) => Promise<unknown>;
  findMany: (...args: any[]) => Promise<unknown[]>;
  findUnique: (...args: any[]) => Promise<unknown>;
};

export function getPublicEventFavoriteDelegate() {
  return (prisma as PrismaClient & {
    publicEventFavorite?: PublicEventFavoriteDelegate;
  }).publicEventFavorite;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
