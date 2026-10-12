import { notFound } from "next/navigation";
import { UnoPreview } from "@/features/game-tools/components/UnoPreview";

export default async function UnoPreviewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ scene?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const scene = (await searchParams).scene;
  return <UnoPreview locale={(await params).locale} initialScene={scene === "lobby" || scene === "entry" ? scene : "table"}/>;
}
