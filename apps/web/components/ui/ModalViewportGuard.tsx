"use client";

import { useEffect } from "react";

const modalSelector = [
  '[role="dialog"][aria-modal="true"]',
  '[role="alertdialog"][aria-modal="true"]',
  "dialog[open]",
].join(",");

function getModalOverlay(dialog: HTMLElement) {
  let candidate: HTMLElement = dialog;
  let current: HTMLElement | null = dialog;

  while (current && current !== document.body) {
    if (window.getComputedStyle(current).position === "fixed") {
      candidate = current;
    }
    current = current.parentElement;
  }

  return candidate;
}

function getStackingIndex(element: HTMLElement) {
  let current: HTMLElement | null = element;
  let highest = 0;

  while (current && current !== document.body) {
    const parsed = Number.parseInt(window.getComputedStyle(current).zIndex, 10);
    if (Number.isFinite(parsed)) highest = Math.max(highest, parsed);
    current = current.parentElement;
  }

  return highest;
}

function restoreManagedDialogs() {
  document
    .querySelectorAll<HTMLElement>("[data-friemi-dialog-obscured]")
    .forEach((element) => {
      element.removeAttribute("data-friemi-dialog-obscured");
      element.inert = false;
    });
  document
    .querySelectorAll<HTMLElement>("[data-friemi-dialog-active]")
    .forEach((element) => element.removeAttribute("data-friemi-dialog-active"));
  document
    .querySelectorAll<HTMLElement>("[data-friemi-modal-overlay-active]")
    .forEach((element) =>
      element.removeAttribute("data-friemi-modal-overlay-active"),
    );
}

function isVisibleDialog(element: HTMLElement) {
  if (element.hidden) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

export function ModalViewportGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let frameId: number | null = null;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      root.style.setProperty(
        "--friemi-modal-viewport-height",
        `${Math.round(viewport?.height ?? window.innerHeight)}px`,
      );
      root.style.setProperty(
        "--friemi-modal-viewport-offset-top",
        `${Math.round(viewport?.offsetTop ?? 0)}px`,
      );
    };

    const updateModalStack = () => {
      frameId = null;
      restoreManagedDialogs();
      const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>(modalSelector),
      ).filter(isVisibleDialog);

      if (dialogs.length === 0) {
        delete root.dataset.friemiModalOpen;
        return;
      }

      root.dataset.friemiModalOpen = "true";
      const activeDialog = dialogs
        .map((dialog, index) => ({
          dialog,
          index,
          stackingIndex: getStackingIndex(dialog),
        }))
        .sort(
          (left, right) =>
            left.stackingIndex - right.stackingIndex ||
            left.index - right.index,
        )
        .at(-1)!.dialog;
      const activeOverlay = getModalOverlay(activeDialog);

      activeDialog.dataset.friemiDialogActive = "true";
      activeOverlay.dataset.friemiModalOverlayActive = "true";

      for (const dialog of dialogs) {
        if (dialog === activeDialog) continue;

        const overlay = getModalOverlay(dialog);
        if (overlay.contains(activeDialog)) continue;

        overlay.dataset.friemiDialogObscured = "true";
        overlay.inert = true;
      }
    };

    const scheduleModalStackUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateModalStack);
    };

    const observer = new MutationObserver(scheduleModalStackUpdate);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-hidden", "aria-modal", "hidden", "open", "style"],
      childList: true,
      subtree: true,
    });

    updateViewport();
    scheduleModalStackUpdate();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);

    return () => {
      observer.disconnect();
      restoreManagedDialogs();
      delete root.dataset.friemiModalOpen;
      root.style.removeProperty("--friemi-modal-viewport-height");
      root.style.removeProperty("--friemi-modal-viewport-offset-top");
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
