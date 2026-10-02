import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { runAaSimpleCommand } from "../actions/aaSimpleActions";
import type { AaSimpleState } from "../domain/simpleLedger";
import { AaSimpleClient, type AaScreen } from "./AaSimpleClient";

export function AaSimpleSurface({ state, locale, screen, recordId }: { state: AaSimpleState; locale: string; screen?: AaScreen; recordId?: string }) {
  return <div className="app-page-mobile-safe-top app-page-mobile-safe-bottom">
    <MobileNavSectionOverride section="activities" />
    <AaSimpleClient initialState={state} locale={locale} initialScreen={screen} initialRecordId={recordId}
      onCommand={runAaSimpleCommand.bind(null, state.activityId, locale)} />
  </div>;
}
