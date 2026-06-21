"use client";

import { useViewerProfile } from "./ViewerProfileProvider";
import { NicknameRequiredDialog } from "./NicknameRequiredDialog";

type NicknameRequiredGateProps = {
  locale: string;
};

export function NicknameRequiredGate({ locale }: NicknameRequiredGateProps) {
  const { nicknameResolved } = useViewerProfile();

  if (nicknameResolved) {
    return null;
  }

  return <NicknameRequiredDialog locale={locale} />;
}
