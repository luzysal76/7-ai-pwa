import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import RadialMenu from './RadialMenu.jsx';

export default function FloatingButton({ onClick, onLongPress, templates = [], settings = {} }) {
  const btnSize = settings.btnSize || 56;
  const opacity = (settings.btnOpacity || 90) / 100;
  const snapToCorner = settings.snapToCorner !== false;
  const autoHideDelay = settings.autoHideDelay ?? 5;

  const [pos, setPos] = useState({ x: window.innerWidth - btnSize / 2 - 16, y: window.innerHeight - 160 });
  const [dragging, setDragging] = useState(false);
  const [radialVisible, setRadialVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dropZone, setDropZone] = useState(null); // 'delete' | 'complete' | null
  const [isDragged, setIsDragged] = useState(false);

  const btnRef = useRef(null);
  const dragStart = useRef(null);
  const startPos = useRef(null);
  const longPressTimer = useRef(null);
  const lastTap = useRef(0);
  const autoHideTimer = useRef(null);

  // DND check
  const isInDND = useCallback(() => {
    if (!settings.dndEnabled) return false;
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const cur = h * 60 + m;
    const [sh, sm] = (settings.dndStart || '22:00').split(':').map(Number);
    const [eh, em] = (settings.dndEnd || '08:00').split(':').map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    return start > end ? (cur >= start || cur < end) : (cur >= start && cur < end);
  }, [settings]);

  useEffect(() => {
    const check = () => setHidden(isInDND());
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [isInDND]);

  // Auto-hide on inactivity
  const resetAutoHide = useCallback(() => {
    if (!autoHideDelay) return;
    clearTimeout(autoHideTimer.current);
    setHidden(false);
    autoHideTimer.current = setTimeout(() => {
      if (!isInDND()) setHidden(true);
    }, autoHideDelay * 1000);
  }, [autoHideDelay, isInDND]);

  useEffect(() => {
    if (autoHideDelay > 0) {
      const show = () => resetAutoHide();
      window.addEventListener('touchstart', show, { passive: true });
      window.addEventListener('click', show);
      resetAutoHide();
      return () => { window.removeEventListener('touchstart', show); window.removeEventListener('click', show); };
    }
  }, [autoHideDelay, resetAutoHide]);

  // Snap to edge / corner
  const snapPos = useCallback((x, y) => {
    const w = window.innerWidth, h = window.innerHeight;
    const m = 12;
    const clampY = Math.max(m + btnSize / 2, Math.min(h - 60 - btnSize / 2 - m, y));
    if (snapToCorner) {
      const snapX = x < w / 2 ? m + btnSize / 2 : w - m - btnSize / 2;
      const corners = [
        { x: m + btnSize / 2, y: 80 + btnSize / 2 },
        { x: w - m - btnSize / 2, y: 80 + btnSize / 2 },
        { x: m + btnSize / 2, y: h - 80 - btnSize / 2 },
        { x: w - m - btnSize / 2, y: h - 80 - btnSize / 2 },
      ];
      const nearest = corners.reduce((a, b) =>
        (Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y)) ? b : a
      );
      return { x: nearest.x, y: nearest.y };
    }
    return { x: x < w / 2 ? m + btnSize / 2 : w - m - btnSize / 2, y: clampY };
  }, [btnSize, snapToCorner]);

  // Drop zones: left 20% = delete, right 80% = complete
  const getDropZone = (x) => {
    if (x < window.innerWidth * 0.2) return 'delete';
    if (x > window.innerWidth * 0.8) return 'complete';
    return null;
  };

  const handleTouchStart = useCallback((e) => {
    resetAutoHide();
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    startPos.current = { ...pos };
    setIsDragged(false);

    // Long press
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40);
      setRadialVisible(true);
    }, 480);
  }, [pos, resetAutoHide]);

  const handleTouchMove = useCallback((e) => {
    if (!dragStart.current) return;
    e.preventDefault();
    clearTimeout(longPressTimer.current);
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      setIsDragged(true);
      setDragging(true);
    }
    const newX = startPos.current.x + dx;
    const newY = startPos.current.y + dy;
    setPos({ x: newX, y: newY });
    setDropZone(getDropZone(newX));
  }, []);

  const handleTouchEnd = useCallback((e) => {
    clearTimeout(longPressTimer.current);
    if (radialVisible) return;

    if (isDragged && dropZone) {
      // Drop zone action - emit event
      window.dispatchEvent(new CustomEvent('float-dropzone', { detail: dropZone }));
      setDropZone(null);
      setIsDragged(false);
      setDragging(false);
      setPos(snapPos(pos.x, pos.y));
      return;
    }

    if (isDragged) {
      setPos(snapPos(pos.x, pos.y));
    } else {
      // Tap → double-tap check
      const now = Date.now();
      if (now - lastTap.current < 280) {
        lastTap.current = 0;
        // Double tap: voice mode
        onClick?.('voice');
      } else {
        lastTap.current = now;
        setTimeout(() => {
          if (lastTap.current !== 0) { onClick?.('normal'); lastTap.current = 0; }
        }, 290);
      }
    }
    setDragging(false);
    setIsDragged(false);
    setDropZone(null);
    dragStart.current = null;
  }, [isDragged, dropZone, radialVisible, pos, snapPos, onClick]);

  // Window resize
  useEffect(() => {
    const onResize = () => setPos(prev => snapPos(prev.x, prev.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [snapPos]);

  const dropZoneColor = dropZone === 'delete' ? 'rgba(239,68,68,0.85)' : dropZone === 'complete' ? 'rgba(52,211,153,0.85)' : null;

  if (hidden && !dragging) {
    return (
      <button
        className="fixed z-50 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          right: 8,
          bottom: 100,
          background: 'rgba(99,102,241,0.3)',
          border: '1px solid rgba(99,102,241,0.4)',
        }}
        onClick={() => { setHidden(false); resetAutoHide(); }}
      >
        <span style={{ fontSize: '12px' }}>✏️</span>
      </button>
    );
  }

  return (
    <>
      {/* Drop zone indicators */}
      {dragging && (
        <>
          <div className="fixed left-0 top-0 bottom-0 z-40 flex items-center justify-center"
            style={{ width: '20%', background: dropZone === 'delete' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.06)', transition: 'background 0.2s', pointerEvents: 'none' }}>
            <span className="text-3xl opacity-50">🗑️</span>
          </div>
          <div className="fixed right-0 top-0 bottom-0 z-40 flex items-center justify-center"
            style={{ width: '20%', background: dropZone === 'complete' ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.06)', transition: 'background 0.2s', pointerEvents: 'none' }}>
            <span className="text-3xl opacity-50">✅</span>
          </div>
        </>
      )}

      {/* Floating button */}
      <div
        ref={btnRef}
        className="fixed z-50 select-none"
        style={{
          left: pos.x - btnSize / 2, top: pos.y - btnSize / 2,
          width: btnSize, height: btnSize,
          touchAction: 'none',
          opacity: dragging ? 1 : opacity,
          transition: dragging ? 'none' : 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full" style={{ background: '#6366f1', animation: 'float-pulse 2.5s ease-out infinite', zIndex: -1 }} />

        <div
          className="w-full h-full rounded-full flex items-center justify-center shadow-2xl"
          style={{
            background: dropZoneColor || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
            transform: dragging ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.15s ease, background 0.2s ease',
          }}
        >
          <Plus size={Math.round(btnSize * 0.46)} color="white" strokeWidth={2.5} />
        </div>
      </div>

      {/* Radial menu */}
      <RadialMenu
        visible={radialVisible}
        center={pos}
        templates={templates}
        onSelect={(tpl) => {
          setRadialVisible(false);
          onClick?.(tpl.type, tpl);
        }}
        onClose={() => setRadialVisible(false)}
      />

      <style>{`
        @keyframes float-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          70% { transform: scale(1.65); opacity: 0; }
          100% { transform: scale(1.65); opacity: 0; }
        }
      `}</style>
    </>
  );
}
