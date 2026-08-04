import { RouteLoadingScreen } from "@/components/ui/LoadingState";

export default function AdminActivityPriorityLoading() {
  return (
    <RouteLoadingScreen className="mobile-v23-admin-priority app-mobile-page-shell !min-h-[100dvh] !bg-white !pb-[calc(var(--app-mobile-nav-height)+var(--app-bottom-safe-area)+1.1rem)] !pt-[calc(var(--app-top-safe-area)+0.9rem)]" />
  );
}
