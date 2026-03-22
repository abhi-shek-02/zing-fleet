import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onAccept: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Drag the thumb to the right to confirm. Track fills with a green gradient as you drag.
 */
export function SwipeToAccept({ onAccept, disabled, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const dragging = useRef(false);
  const startPointer = useRef(0);
  const startOffset = useRef(0);
  const maxOffset = useRef(0);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const thumb = 44;
    maxOffset.current = Math.max(0, track.clientWidth - thumb - 8);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const endDrag = useCallback(() => {
    dragging.current = false;
    const max = maxOffset.current;
    if (max > 0 && offsetRef.current >= max * 0.88) {
      onAccept();
    }
    offsetRef.current = 0;
    setOffset(0);
  }, [onAccept]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    measure();
    dragging.current = true;
    startPointer.current = e.clientX;
    startOffset.current = offsetRef.current;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || disabled) return;
    const dx = e.clientX - startPointer.current;
    const next = Math.min(maxOffset.current, Math.max(0, startOffset.current + dx));
    offsetRef.current = next;
    setOffset(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragging.current) endDrag();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const max = maxOffset.current || 1;
  const progress = Math.min(1, offset / max);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex h-12 w-full select-none items-center overflow-hidden rounded-full border-2 bg-muted/40 transition-[border-color] duration-200",
        progress > 0.75 ? "border-emerald-500/60" : "border-border/80",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* Progress fill */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500/25 via-emerald-500/40 to-emerald-600/50 transition-[width] duration-75 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200",
          progress > 0.4 ? "text-emerald-800 dark:text-emerald-200" : "text-muted-foreground",
        )}
      >
        {progress > 0.85 ? "Release to accept" : "Swipe to accept"}
      </div>
      <button
        type="button"
        aria-label="Swipe right to accept booking"
        className={cn(
          "absolute left-1 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-lg touch-none transition-[transform,background-color,box-shadow] duration-75",
          progress > 0.5
            ? "bg-emerald-600 text-white ring-2 ring-emerald-400/50"
            : "bg-primary text-primary-foreground",
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
