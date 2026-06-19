import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 80;

export default function SwipeableCard({ children, onDelete, onComplete, style, className }) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [committed, setCommitted] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const animFrame = useRef(null);

  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Prefer vertical scroll over swipe if more vertical
    if (!isDragging && Math.abs(dy) > Math.abs(dx) + 10) {
      startX.current = null;
      return;
    }

    if (Math.abs(dx) > 8) setIsDragging(true);

    if (committed) return;
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(() => {
      // Rubber-band effect at extremes
      const maxDrag = THRESHOLD * 1.8;
      const clamped = Math.max(-maxDrag, Math.min(maxDrag, dx));
      setOffset(clamped);
    });
  }, [isDragging, committed]);

  const handleTouchEnd = useCallback(() => {
    if (committed) return;
    if (offset < -THRESHOLD) {
      // Delete
      setOffset(-window.innerWidth);
      setCommitted(true);
      setTimeout(() => onDelete?.(), 280);
    } else if (offset > THRESHOLD) {
      // Complete — only commit if handler exists; otherwise rubber-band back (B-3)
      if (onComplete) {
        setOffset(window.innerWidth);
        setCommitted(true);
        setTimeout(() => onComplete(), 280);
      } else {
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
    setIsDragging(false);
    startX.current = null;
  }, [offset, committed, onDelete, onComplete]);

  const absOffset = Math.abs(offset);
  const showDelete = offset < -20;
  const showComplete = offset > 20;
  const deleteOpacity = Math.min(1, absOffset / THRESHOLD);
  const completeOpacity = Math.min(1, absOffset / THRESHOLD);

  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={{ borderRadius: '16px', ...style }}>
      {/* Delete background */}
      {showDelete && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl"
          style={{
            background: `rgba(239,68,68,${0.1 + deleteOpacity * 0.5})`,
            opacity: deleteOpacity,
          }}
        >
          <span className="text-2xl">🗑️</span>
          <span className="text-red-400 text-sm font-bold ml-2">삭제</span>
        </div>
      )}

      {/* Complete background */}
      {showComplete && (
        <div
          className="absolute inset-0 flex items-center justify-start pl-5 rounded-2xl"
          style={{
            background: `rgba(52,211,153,${0.1 + completeOpacity * 0.5})`,
            opacity: completeOpacity,
          }}
        >
          <span className="text-2xl">✅</span>
          <span className="text-green-400 text-sm font-bold ml-2">완료</span>
        </div>
      )}

      {/* Card content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          touchAction: 'pan-y',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
