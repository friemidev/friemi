"use client";

import { useEffect } from "react";
import { useMobileNavSection } from "./MobileNavSectionContext";

type MobileNavSectionOverrideProps = {
  section: "activities" | "lobby";
};

export function MobileNavSectionOverride({
  section,
}: MobileNavSectionOverrideProps) {
  const { setSectionOverride } = useMobileNavSection();

  useEffect(() => {
    setSectionOverride(section);

    return () => {
      setSectionOverride(null);
    };
  }, [section, setSectionOverride]);

  return null;
}
