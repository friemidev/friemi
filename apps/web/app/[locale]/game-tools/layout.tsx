import type { ReactNode } from "react";
import { GameToolsMobileChrome } from "@/features/game-tools/components/GameToolsMobileChrome";

export default function GameToolsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <GameToolsMobileChrome />
      {children}
    </>
  );
}
