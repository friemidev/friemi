import { DrawGuessInteractionSounds } from "@/features/game-tools/components/DrawGuessInteractionSounds";

export default function DrawGuessLayout({ children }: { children: React.ReactNode }) {
  return <><DrawGuessInteractionSounds />{children}</>;
}
