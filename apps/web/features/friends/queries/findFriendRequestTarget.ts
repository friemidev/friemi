import { prisma } from "@/lib/prisma";

const friendTargetSelect = {
  id: true,
  nickname: true,
  friendCode: true,
  avatarUrl: true,
} as const;

export type FriendRequestTarget = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
};

function normalizeFullWidthDigits(value: string) {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

function getNormalizedFriendCode(value: string) {
  const compactValue = normalizeFullWidthDigits(value).replace(/[\s-]/g, "");

  return /^\d{6}$/.test(compactValue) ? compactValue : null;
}

export function normalizeFriendRequestSearchTerm(rawSearchTerm: string) {
  const searchTerm = normalizeFullWidthDigits(rawSearchTerm).trim();
  const friendCode = getNormalizedFriendCode(searchTerm);

  return {
    friendCode,
    searchTerm,
  };
}

export async function findFriendRequestTargets(
  rawSearchTerm: string,
): Promise<FriendRequestTarget[]> {
  const { friendCode, searchTerm } =
    normalizeFriendRequestSearchTerm(rawSearchTerm);

  if (!searchTerm) {
    return [];
  }

  const where = friendCode
    ? {
        status: "ACTIVE" as const,
        friendCode,
      }
    : {
        status: "ACTIVE" as const,
        nickname: {
          equals: searchTerm,
          mode: "insensitive" as const,
        },
      };

  return prisma.userProfile.findMany({
    where,
    select: friendTargetSelect,
    take: 2,
  });
}
