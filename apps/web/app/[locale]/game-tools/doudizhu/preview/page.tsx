import { notFound } from "next/navigation";
import { DoudizhuPreview } from "@/features/game-tools/components/DoudizhuPreview";
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scene?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { scene } = await searchParams;
  return (
    <DoudizhuPreview
      locale={(await params).locale}
      initialScene={scene === "lobby" || scene === "entry" ? scene : "table"}
    />
  );
}
