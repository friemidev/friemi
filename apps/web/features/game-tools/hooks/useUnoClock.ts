"use client";

import { createContext, useContext } from "react";

// Standalone practice has a local clock. Room clients provide a server sample.
const UnoClockContext = createContext<() => number>(() => Date.now());
export const UnoClockProvider = UnoClockContext.Provider;
export function useUnoNow() { return useContext(UnoClockContext); }
