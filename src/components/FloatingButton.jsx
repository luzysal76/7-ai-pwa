import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';

export default function FloatingButton({ onClick }) {
  const [pos, setPos] = useState({ x: window.innerWidth - 76, y: window.innerHeight - 160 });
  const [dragging, setDragging] = useState(false);
  const [isDragged, setIsDragged] = useState(false);
  const btnRef = useRef(null);
  const dragStart = useRef(null);
  const startPos = useRef(null);
  const animFrame = useRef(null);

  // Snap to edge after drag
  const snapToEdge = useCallback((x, y) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const btnSize = 56;
    const margin = 12;

    // Clamp y
    const clampedY = Math.max(
      margin + (btnSize / 2),
      Math.min(h - margin - (btnSize / 2) - 60, y)
    );

    // Snap to nearest horizontal edge
    const snappedX = x < w / 2
      ? margin + btnSize / 2
      : w - margin - btnSize / 2;

    return { x: snappedX, y: clampedY };
  }, []);

  // Touch events
  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    startPos.current = { ...pos };
    setIsDragged(false);
  }, [pos]);

  const onTouchMove = useCallback((e) => {
    if (!dragStart.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;

    if (!dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setDragging(true);
      setIsDragged(true);
    }

    if (dragging || Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragged(true);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      animFrame.current = requestAnimationFrame(() => {
        setPos({
          x: startPos.current.x + dx,
          y: startPos.current.y + dy,
        });
      });
    }
  }, [dragging]);

  const onTouchEnd = useCallback((e) => {
    if (!isDragged) {
      onClick?.();
    } else {
      // Snap to edge
      const snapped = snapToEdge(pos.x, pos.y);
      setPos(snapped);
    }
    setDragging(false);
    dragStart.current = null;
    startPos.current = null;
    setTimeout(() => setIsDragged(false), 50);
  }, [isDragged, onClick, snapToEdge, pos]);

  // Mouse events (desktop)
  const onMouseDown = useCallback((e) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...pos };
    setIsDragged(false);

    const onMouseMove = (e) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setIsDragged(true);
      setPos({
        x: startPos.current.x + dx,
        y: startPos.current.y + dy,
      });
    };

    const onMouseUp = () => {
      if (!isDragged) {
        // Will be handled by onClick
      } else {
        const snapped = snapToEdge(pos.x, pos.y);
        setPos(snapped);
      }
      setDragging(false);
      dragStart.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => setIsDragged(false), 50);
    };

    setDragging(true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [pos, isDragged, snapToEdge]);

  const handleClick = useCallback(() => {
    if (!isDragged) onClick?.();
  }, [isDragged, onClick]);

  // Update position on window resize
  useEffect(() => {
    const onResize = () => {
      setPos(prev => snapToEdge(prev.x, prev.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [snapToEdge]);

  const btnSize = 56;

  return (
    <div
      ref={btnRef}
      className="fixed z-50 select-none"
      style={{
        left: pos.x - btnSize / 2,
        top: pos.y - btnSize / 2,
        width: btnSize,
        height: btnSize,
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        transition: dragging ? 'none' : 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onClick={handleClick}
    >
      {/* Pulse ring */}
      <div
        className="absolute inset-0 rounded-full bg-indigo-500 opacity-0"
        style={{
          animation: 'pulse-ring 2.5s ease-out infinite',
        }}
      />
      {/* Button */}
      <div
        className="w-full h-full rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.3)',
          transform: dragging ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}
      >
        <Plus size={26} color="white" strokeWidth={2.5} />
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
