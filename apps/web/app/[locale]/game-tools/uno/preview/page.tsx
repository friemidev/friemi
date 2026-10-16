import { notFound } from "next/navigation";
import { UnoPreview } from "@/features/game-tools/components/UnoPreview";
import { isUnoPreviewScenario } from "@/features/game-tools/unoPreviewScenarios";

export default async function UnoPreviewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ scene?: string; scenario?: string; autoplay?: string; count?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { scene, scenario, autoplay, count } = await searchParams;
  const validatedScenario = isUnoPreviewScenario(scenario) ? scenario : undefined;
  return <UnoPreview locale={(await params).locale} initialScene={scene === "lobby" || scene === "entry" ? scene : "table"} scenario={validatedScenario} autoplay={autoplay !== "0"} playerCount={count ? Number(count) : 4}/>;
}
