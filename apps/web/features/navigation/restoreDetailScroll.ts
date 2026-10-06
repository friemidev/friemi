export function restoreDetailScroll(scrollY: number) {
  if (!Number.isFinite(scrollY) || scrollY < 0) return;

  let stopped = false;
  let frame = 0;
  let timeout = 0;
  const inputEvents = ["pointerdown", "touchstart", "wheel", "keydown"] as const;
  const observer = typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(() => schedule());

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timeout);
    observer?.disconnect();
    inputEvents.forEach((event) => window.removeEventListener(event, stop, true));
  }

  function restore() {
    window.scrollTo({ top: scrollY, behavior: "instant" });
    return Math.abs(window.scrollY - scrollY) <= 1;
  }

  function schedule() {
    if (stopped || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (restore()) stop();
    });
  }

  inputEvents.forEach((event) => window.addEventListener(event, stop, {
    capture: true,
    passive: true,
  }));
  observer?.observe(document.body);
  timeout = window.setTimeout(stop, 1500);
  restore();
  // Run once after Next restores its own history position. Retry only if content
  // is still too short, and never pull the user back after they start interacting.
  schedule();
  return stop;
}
