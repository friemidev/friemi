import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaOptions: Prisma.PrismaClientOptions = {
  // Existing games must remain readable before the UNO migration is applied.
  // UNO only filters/writes this index column; its deadline is read from state.
  omit: { gameToolRoom: { unoDeadlineAt: true } },
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

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

type UserProfileRemarkDelegate = PrismaClient["userProfileRemark"];

export function getUserProfileRemarkDelegate() {
  return (prisma as PrismaClient & {
    userProfileRemark?: UserProfileRemarkDelegate;
  }).userProfileRemark;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
