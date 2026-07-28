import { BrandLoader } from "@/components/ui/BrandLoader";

export default function LocaleLoading() {
  return (
    <div className="route-loading-shell flex min-h-[calc(100vh-4rem)] items-start justify-center bg-[#FEFFF9] px-4 pt-20 sm:pt-24">
      <BrandLoader label="Loading" size="sm" />
    </div>
  );
}
