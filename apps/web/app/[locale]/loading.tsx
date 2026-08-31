import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

export default function LocaleLoading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-white px-6 text-[#111210]">
      <LocalizedBrandLoader size="sm" showLabel />
    </main>
  );
}
