"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileNavSection = "activities" | "lobby" | null;

type MobileNavSectionContextValue = {
  sectionOverride: MobileNavSection;
  setSectionOverride: (section: MobileNavSection) => void;
};

const defaultContextValue: MobileNavSectionContextValue = {
  sectionOverride: null,
  setSectionOverride: () => {},
};

const MobileNavSectionContext = createContext<MobileNavSectionContextValue>(
  defaultContextValue,
);

export function MobileNavSectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [sectionOverride, setSectionOverride] = useState<MobileNavSection>(null);
  const value = useMemo(
    () => ({
      sectionOverride,
      setSectionOverride,
    }),
    [sectionOverride],
  );

  return (
    <MobileNavSectionContext.Provider value={value}>
      {children}
    </MobileNavSectionContext.Provider>
  );
}

export function useMobileNavSection() {
  return useContext(MobileNavSectionContext);
}
