import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onAccept: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Drag the thumb to the right to confirm. No second tap — matches “swipe to accept” UX.
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
    startOffset.current = offset;
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

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex h-12 w-full select-none items-center overflow-hidden rounded-full border border-border/80 bg-muted/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Swipe to accept
      </div>
      <button
        type="button"
        aria-label="Swipe right to accept booking"
        className="absolute left-1 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md touch-none"
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
