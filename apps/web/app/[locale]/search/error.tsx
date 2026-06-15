"use client";

import { RouteErrorState } from "@/components/ui/RouteErrorState";
import type { RouteErrorProps } from "@/components/ui/RouteErrorState";

export default function SearchError({ error, reset }: RouteErrorProps) {
  void error;

  return <RouteErrorState reset={reset} />;
}
