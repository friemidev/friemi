import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * Set on pages whose mobile header is hidden (see AppHeaderChrome's
   * shouldHideHeaderOnMobile) so content clears the status bar/notch
   * instead of sitting under it. Skip this on pages that already defer
   * safe-area handling to a nested child (e.g. an .app-mobile-page-shell
   * component), or it'll be padded twice.
   */
  mobileSafeTop?: boolean;
  /**
   * Set on pages whose mobile bottom nav is visible so content clears it
   * instead of being hidden behind it. Same double-padding caveat as
   * mobileSafeTop applies.
   */
  mobileSafeBottom?: boolean;
};

export function PageContainer({
  children,
  className,
  mobileSafeTop,
  mobileSafeBottom,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8",
        className,
        mobileSafeTop && "app-page-mobile-safe-top",
        mobileSafeBottom && "app-page-mobile-safe-bottom",
      )}
    >
      {children}
    </main>
  );
}
