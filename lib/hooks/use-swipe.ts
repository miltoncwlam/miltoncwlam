"use client";

import { useRef, type TouchEvent } from "react";

export function useSwipe(handlers: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const startX = useRef<number | null>(null);
  const threshold = handlers.threshold ?? 48;

  return {
    onTouchStart: (event: TouchEvent) => {
      startX.current = event.changedTouches[0]?.clientX ?? null;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (startX.current == null) return;
      const endX = event.changedTouches[0]?.clientX ?? startX.current;
      const delta = endX - startX.current;
      startX.current = null;
      if (Math.abs(delta) < threshold) return;
      if (delta < 0) handlers.onSwipeLeft?.();
      else handlers.onSwipeRight?.();
    },
  };
}
