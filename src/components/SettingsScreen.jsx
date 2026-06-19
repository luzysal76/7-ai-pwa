import { useState, useCallback } from 'react';
import { Bell, Trash2, Download, ChevronRight, Monitor, Brain, Clock, Shield } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications.js';

function Section({ title, icon, children }) {
  return (
    <div className="mx-4 mb-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
        {icon}{title}
      </h2>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, sub, icon, iconBg, right, onClick, last }) {
  return (
    <div
      className={`flex items-center gap-3 p-4 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-all' : ''}`}
      style={!last ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}
      onClick={onClick}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg || 'rgba(99,102,241,0.12)' }}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? '#6366f1' : 'rgba(255,255,255,0.1)' }}>
      <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md"
        style={{ left: value ? '26px' : '4px' }} />
    </button>
  );
}

export default function SettingsScreen({ settings, updateSettings, templates, updateTemplate, memoCount, emotionCount }) {
  const { requestPermission, scheduleMorningBriefing } = useNotifications();
  const [saved, setSaved] = useState(false);
  const [editTpl, setEditTpl] = useState(null);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const toggleBriefing = async () => {
    if (!settings.morningBriefingEnabled) {
      const granted = await requestPermission();
      if (granted) {
        updateSettings({ morningBriefingEnabled: true, notificationsGranted: true });
        scheduleMorningBriefing('오늘의 할 일을 확인하세요! 📋', settings.morningBriefingTime);
        showSaved();
      } else {
        alert('브라우저 설정에서 알림 권한을 허용해주세요.');
      }
    } else {
      updateSettings({ morningBriefingEnabled: false });
      showSaved();
    }
  };

  // S-2: selective delete — only fm_ prefix keys, not the entire localStorage
  const clearData = () => {
    if (confirm('모든 데이터를 삭제할까요? 되돌릴 수 없어요.')) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('fm_'))
        .forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  // S-3: revoke ObjectURL immediately after click to prevent memory leak
  const exportData = () => {
    const data = {
      memos: JSON.parse(localStorage.getItem('fm_memos') || '[]'),
      emotions: JSON.parse(localStorage.getItem('fm_emotions') || '[]'),
      exportedAt: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `floating-memo-${new Date().toLocaleDateString('ko-KR').replace(/\./g, '-')}.json`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const BTN_SIZES = [{ size: 40, label: 'S' }, { size: 56, label: 'M' }, { size: 72, label: 'L' }];

  const AUTOSHOW_OPTIONS = [
    { val: 0, label: '끄기' }, { val: 3, label: '3초' }, { val: 5, label: '5초' }, { val: 10, label: '10초' }
  ];

  const POMODORO_OPTIONS = [{ val: 15, label: '15분' }, { val: 25, label: '25분' }, { val: 50, label: '50분' }];

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-white">설정</h1>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
        {[{ label: '저장된 메모', value: memoCount, color: '#6366f1' }, { label: '감정 기록', value: emotionCount, color: '#8b5cf6' }].map(s => (
          <div key={s.label} className="p-4 rounded-2xl text-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* UI mode (2-B) */}
      <Section title="UI 모드" icon={<Monitor size={12} />}>
        <Row label="간편 모드" sub={settings.simpleMode ? "플로팅 버튼만 표시" : "전체 기능 사용 중"}
          icon={<span className="text-lg">{settings.simpleMode ? '⚡' : '🎛️'}</span>}
          right={<Toggle value={settings.simpleMode} onChange={v => { updateSettings({ simpleMode: v }); showSaved(); }} />}
        />
        <Row label="심리상담사 AI 말투" sub={settings.counselorMode ? "따뜻하고 공감적인 응답" : "일반 응답"}
          icon={<Brain size={18} color="#818cf8" />} last
          right={<Toggle value={settings.counselorMode} onChange={v => { updateSettings({ counselorMode: v }); showSaved(); }} />}
        />
      </Section>

      {/* Widget (2-D) */}
      <Section title="위젯 설정" icon={<span style={{ fontSize: 12 }}>✏️</span>}>
        {/* Button size */}
        <Row label="버튼 크기" sub="S / M(기본) / L"
          icon={<span className="text-lg">🔘</span>}
          right={
            <div className="flex gap-1.5">
              {BTN_SIZES.map(b => (
                <button key={b.size} onClick={() => { updateSettings({ btnSize: b.size }); showSaved(); }}
                  className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{ background: settings.btnSize === b.size ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)', color: settings.btnSize === b.size ? '#818cf8' : '#64748b', border: settings.btnSize === b.size ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent' }}>
                  {b.label}
                </button>
              ))}
            </div>
          }
        />

        {/* Opacity */}
        <Row label={`투명도 ${settings.btnOpacity || 90}%`} sub="30% ~ 100%"
          icon={<span className="text-lg">👁️</span>}
          right={
            <input type="range" min="30" max="100" step="5" value={settings.btnOpacity || 90}
              onChange={e => updateSettings({ btnOpacity: Number(e.target.value) })}
              className="w-28" style={{ accentColor: '#6366f1' }}
            />
          }
        />

        {/* Corner snap */}
        <Row label="모서리 스냅" sub="드래그 후 모서리로 흡착"
          icon={<span className="text-lg">📌</span>}
          right={<Toggle value={settings.snapToCorner !== false} onChange={v => { updateSettings({ snapToCorner: v }); showSaved(); }} />}
        />

        {/* Auto-hide */}
        <Row label="자동 숨김" sub="비활성 후 숨김 시간"
          icon={<Clock size={18} color="#94a3b8" />} last
          right={
            <div className="flex gap-1">
              {AUTOSHOW_OPTIONS.map(o => (
                <button key={o.val} onClick={() => { updateSettings({ autoHideDelay: o.val }); showSaved(); }}
                  className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: settings.autoHideDelay === o.val ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)', color: settings.autoHideDelay === o.val ? '#818cf8' : '#64748b' }}>
                  {o.label}
                </button>
              ))}
            </div>
          }
        />
      </Section>

      {/* Templates (2-E) */}
      <Section title="빠른 버튼 템플릿" icon={<span style={{ fontSize: 12 }}>🎯</span>}>
        {(templates || []).map((tpl, i) => (
          <Row key={tpl.id} label={`${tpl.icon} ${tpl.label}`} sub={tpl.type}
            icon={null} last={i === (templates.length - 1)}
            onClick={() => setEditTpl(tpl)}
            right={<ChevronRight size={16} color="#475569" />}
          />
        ))}
      </Section>

      {/* Template editor modal */}
      {editTpl && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setEditTpl(null)}>
          <div className="w-full p-5 rounded-t-3xl slide-up" style={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.25)' }} onClick={e => e.stopPropagation()}>
            <p className="text-base font-bold text-white mb-4">템플릿 수정</p>
            <div className="flex gap-2 mb-3">
              <input value={editTpl.icon} onChange={e => setEditTpl(t => ({ ...t, icon: e.target.value }))}
                className="w-16 text-center text-2xl bg-transparent border rounded-xl p-2 outline-none" style={{ borderColor: 'rgba(99,102,241,0.3)' }} />
              <input value={editTpl.label} onChange={e => setEditTpl(t => ({ ...t, label: e.target.value }))}
                className="flex-1 bg-transparent border rounded-xl p-2 text-white outline-none text-sm" style={{ borderColor: 'rgba(99,102,241,0.3)' }} />
            </div>
            <button onClick={() => { updateTemplate(editTpl.id, { icon: editTpl.icon, label: editTpl.label }); setEditTpl(null); showSaved(); }}
              className="w-full py-3 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
              저장
            </button>
          </div>
        </div>
      )}

      {/* Notification (2-H) */}
      <Section title="알림" icon={<Bell size={12} />}>
        <Row label="아침 브리핑" sub="매일 아침 할 일 알림"
          icon={<Bell size={20} color="#818cf8" />}
          right={<Toggle value={settings.morningBriefingEnabled} onChange={toggleBriefing} />}
        />
        <Row label="브리핑 시각" sub="알림 받을 시간"
          icon={<span className="text-lg">⏰</span>} last
          right={
            <input type="time" value={settings.morningBriefingTime}
              onChange={e => { updateSettings({ morningBriefingTime: e.target.value }); if (settings.morningBriefingEnabled) scheduleMorningBriefing('오늘의 할 일!', e.target.value); }}
              className="text-sm font-mono text-indigo-400 bg-transparent outline-none" />
          }
        />
      </Section>

      {/* DND (2-J) */}
      <Section title="방해 금지 모드" icon={<Shield size={12} />}>
        <Row label="방해 금지" sub={settings.dndEnabled ? `${settings.dndStart} ~ ${settings.dndEnd} 자동 숨김` : '끄기'}
          icon={<Shield size={18} color="#f87171" />}
          right={<Toggle value={settings.dndEnabled} onChange={v => { updateSettings({ dndEnabled: v }); showSaved(); }} />}
        />
        {settings.dndEnabled && (
          <>
            <Row label="시작 시각" icon={<span className="text-lg">🌙</span>}
              right={<input type="time" value={settings.dndStart || '22:00'} onChange={e => updateSettings({ dndStart: e.target.value })} className="text-sm font-mono text-indigo-400 bg-transparent outline-none" />}
            />
            <Row label="종료 시각" icon={<span className="text-lg">🌅</span>}
              right={<input type="time" value={settings.dndEnd || '08:00'} onChange={e => updateSettings({ dndEnd: e.target.value })} className="text-sm font-mono text-indigo-400 bg-transparent outline-none" />}
            />
          </>
        )}
        <Row label="집중 타이머 (뽀모도로)" sub={`${settings.pomodoroMinutes || 25}분 집중 후 숨김`}
          icon={<span className="text-lg">🍅</span>} last
          right={
            <div className="flex gap-1">
              {POMODORO_OPTIONS.map(o => (
                <button key={o.val} onClick={() => { updateSettings({ pomodoroMinutes: o.val }); showSaved(); }}
                  className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: settings.pomodoroMinutes === o.val ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)', color: settings.pomodoroMinutes === o.val ? '#f87171' : '#64748b' }}>
                  {o.label}
                </button>
              ))}
            </div>
          }
        />
      </Section>

      {/* Data */}
      <Section title="데이터" icon={<Download size={12} />}>
        <Row label="데이터 내보내기" sub="JSON 백업" icon={<Download size={20} color="#34d399" />} iconBg="rgba(52,211,153,0.12)" onClick={exportData} right={<ChevronRight size={16} color="#475569" />} />
        <Row label="모든 데이터 삭제" sub="되돌릴 수 없어요" icon={<Trash2 size={20} color="#f87171" />} iconBg="rgba(239,68,68,0.12)" onClick={clearData} last right={<ChevronRight size={16} color="#475569" />} />
      </Section>

      <div className="mx-4 mb-6 text-center">
        <p className="text-xs text-slate-700">플로팅 메모 v2.0.0 — Phase 2</p>
      </div>

      {saved && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm text-green-400 fade-in z-50"
          style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
          ✓ 저장됨
        </div>
      )}
    </div>
  );
}
