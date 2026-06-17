import { useRef, useCallback } from 'react';

// Double tap detector
export function useDoubleTap(onDoubleTap, onSingleTap, delay = 280) {
  const lastTap = useRef(0);
  const timer = useRef(null);

  return useCallback((e) => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      clearTimeout(timer.current);
      lastTap.current = 0;
      onDoubleTap?.(e);
    } else {
      lastTap.current = now;
      timer.current = setTimeout(() => {
        onSingleTap?.(e);
      }, delay);
    }
  }, [onDoubleTap, onSingleTap, delay]);
}

// Long press detector
export function useLongPress(onLongPress, onPress, ms = 500) {
  const timer = useRef(null);
  const pressed = useRef(false);
  const moved = useRef(false);

  const start = useCallback((e) => {
    pressed.current = true;
    moved.current = false;
    timer.current = setTimeout(() => {
      if (pressed.current && !moved.current) {
        // Haptic feedback (mobile)
        if (navigator.vibrate) navigator.vibrate(40);
        onLongPress?.(e);
      }
    }, ms);
  }, [onLongPress, ms]);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    pressed.current = false;
  }, []);

  const move = useCallback(() => {
    moved.current = true;
    clearTimeout(timer.current);
  }, []);

  const end = useCallback((e) => {
    clearTimeout(timer.current);
    if (pressed.current && !moved.current) {
      onPress?.(e);
    }
    pressed.current = false;
  }, [onPress]);

  return { onTouchStart: start, onTouchMove: move, onTouchEnd: end, onMouseDown: start, onMouseUp: end, onMouseLeave: cancel };
}

// Swipe gesture on a card (left/right)
export function useSwipe(onSwipeLeft, onSwipeRight, threshold = 80) {
  const startX = useRef(null);
  const startY = useRef(null);
  const currentX = useRef(0);
  const setOffset = useRef(null);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 20) return; // vertical scroll
    currentX.current = dx;
    setOffset.current?.(dx);
  }, []);

  const onTouchEnd = useCallback(() => {
    const dx = currentX.current;
    if (dx < -threshold) onSwipeLeft?.();
    else if (dx > threshold) onSwipeRight?.();
    else setOffset.current?.(0); // reset
    startX.current = null;
    currentX.current = 0;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd, setOffsetRef: (fn) => { setOffset.current = fn; } };
}
