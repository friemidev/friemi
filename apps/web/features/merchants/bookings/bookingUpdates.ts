export const bookingUpdatedMessage = "friemi:booking-updated";

/** Invalidate the discovery view as well when this form lives in a detail sheet. */
export function notifyBookingUpdated(activityId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(bookingUpdatedMessage, { detail: { activityId } }),
  );
  if (window.parent !== window) {
    window.parent.postMessage(
      { type: bookingUpdatedMessage, activityId },
      window.location.origin,
    );
  }
}
