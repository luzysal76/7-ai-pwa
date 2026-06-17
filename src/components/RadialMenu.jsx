import { useEffect } from 'react';

// Angles for 3 buttons: up-left, up, up-right
const ANGLES = [-135, -90, -45]; // degrees from center
const DIST = 80; // px from center

export default function RadialMenu({ visible, center, templates, onSelect, onClose }) {
  // Close on outside tap
  useEffect(() => {
    if (!visible) return;
    const close = (e) => {
      // If tap is far from center, close
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      if (Math.sqrt(dx * dx + dy * dy) > DIST + 40) onClose?.();
    };
    setTimeout(() => window.addEventListener('touchstart', close), 100);
    return () => window.removeEventListener('touchstart', close);
  }, [visible, center, onClose]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Radial buttons */}
      {templates.map((tpl, i) => {
        const angle = (ANGLES[i] * Math.PI) / 180;
        const x = center.x + Math.cos(angle) * DIST;
        const y = center.y + Math.sin(angle) * DIST;

        return (
          <button
            key={tpl.id}
            className="fixed z-50 flex flex-col items-center gap-1"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              animation: `radialPop 0.25s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms both`,
            }}
            onClick={() => { onSelect(tpl); onClose(); }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: '1px solid rgba(99,102,241,0.4)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)',
              }}
            >
              {tpl.icon}
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(15,23,42,0.9)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {tpl.label}
            </span>
          </button>
        );
      })}

      <style>{`
        @keyframes radialPop {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
