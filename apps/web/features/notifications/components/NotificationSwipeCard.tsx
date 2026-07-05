"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const swipeActionWidth = 104;
const swipeOpenThreshold = 52;

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a,button,input,textarea,select,label,form,[role='button'],[data-no-swipe]",
      ),
    )
  );
}

export function NotificationSwipeCard({
  children,
  mobileDeleteAction,
}: {
  children: ReactNode;
  mobileDeleteAction: ReactNode;
}) {
  const pointerStartX = useRef(0);
  const isDragging = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  function closeSwipe() {
    setIsOpen(false);
    setTranslateX(0);
  }

  function openSwipe() {
    setIsOpen(true);
    setTranslateX(-swipeActionWidth);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch" || isInteractiveTarget(event.target)) {
      return;
    }

    pointerStartX.current = event.clientX;
    isDragging.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging.current) {
      return;
    }

    const deltaX = event.clientX - pointerStartX.current;
    const nextX = isOpen
      ? Math.max(-swipeActionWidth, Math.min(0, -swipeActionWidth + deltaX))
      : Math.max(-swipeActionWidth, Math.min(0, deltaX));

    setTranslateX(nextX);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging.current) {
      return;
    }

    isDragging.current = false;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (translateX <= -swipeOpenThreshold) {
      openSwipe();
      return;
    }

    closeSwipe();
  }

  const actionOffset = Math.max(0, swipeActionWidth + translateX);

  return (
    <div className="relative w-full overflow-hidden rounded-[1.2rem]">
      <div
        className={cn(
          "absolute inset-y-0 right-0 z-0 flex w-[104px] items-stretch justify-end transition-transform duration-200 ease-out sm:hidden",
          dragging ? "transition-none" : null,
        )}
        style={{
          transform: `translateX(${actionOffset}px)`,
        }}
      >
        <div className="flex w-full items-center justify-center rounded-[1.2rem] bg-danger px-3 shadow-[inset_0_0_0_1px_rgba(140,38,29,0.15)]">
          {mobileDeleteAction}
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 w-full touch-pan-y transition-transform duration-200 ease-out",
          dragging ? "transition-none" : null,
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={(event) => {
          if (isOpen && !isInteractiveTarget(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            closeSwipe();
          }
        }}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
