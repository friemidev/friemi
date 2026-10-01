import "server-only";

import { normalizeDrawGuessWordBankWords, type DrawGuessWordBankSnapshot } from "@/features/game-tools/drawGuessEngine";
import { prisma } from "@/lib/prisma";

export type DrawGuessWordBankOption = DrawGuessWordBankSnapshot;

export async function listDrawGuessWordBanks(locale: string): Promise<DrawGuessWordBankOption[]> {
  const banks = await prisma.drawGuessWordBank.findMany({
    where: { locale, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, category: true, title: true, description: true, words: true },
  });
  return banks.flatMap((bank) => {
    const words = normalizeDrawGuessWordBankWords(bank.words);
    return words ? [{ ...bank, words }] : [];
  });
}

export async function getDrawGuessWordBank(id: string, locale: string): Promise<DrawGuessWordBankOption | null> {
  const bank = await prisma.drawGuessWordBank.findFirst({
    where: { id, locale, isActive: true },
    select: { id: true, category: true, title: true, description: true, words: true },
  });
  if (!bank) return null;
  const words = normalizeDrawGuessWordBankWords(bank.words);
  return words ? { ...bank, words } : null;
}

export function shuffledDrawGuessWordBank(bank: DrawGuessWordBankOption): DrawGuessWordBankSnapshot {
  const words = [...bank.words];
  for (let index = words.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [words[index], words[other]] = [words[other], words[index]];
  }
  return { ...bank, words };
}
