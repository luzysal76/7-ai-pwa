import { useState } from 'react';
import { Bell, BellOff, Trash2, Download, Info, ChevronRight, Moon, Sun } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications.js';

export default function SettingsScreen({ settings, updateSettings, memoCount, emotionCount }) {
  const { requestPermission, scheduleMorningBriefing } = useNotifications();
  const [permStatus, setPermStatus] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [saved, setSaved] = useState(false);

  const toggleBriefing = async () => {
    if (!settings.morningBriefingEnabled) {
      const granted = await requestPermission();
      if (granted) {
        updateSettings({ morningBriefingEnabled: true, notificationsGranted: true });
        setPermStatus('granted');
        scheduleMorningBriefing('오늘의 할 일을 확인하세요! 앱을 열어보세요 📋', settings.morningBriefingTime);
        showSaved();
      } else {
        alert('알림 권한이 필요해요. 브라우저 설정에서 허용해주세요.');
      }
    } else {
      updateSettings({ morningBriefingEnabled: false });
      showSaved();
    }
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clearData = () => {
    if (confirm('모든 메모와 감정 기록을 삭제하시겠어요? 되돌릴 수 없어요.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const exportData = () => {
    const data = {
      memos: JSON.parse(localStorage.getItem('fm_memos') || '[]'),
      emotions: JSON.parse(localStorage.getItem('fm_emotions') || '[]'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floating-memo-backup-${new Date().toLocaleDateString('ko-KR').replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useState(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  });

  const installApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      alert('이미 설치되었거나, 브라우저 메뉴에서 "홈 화면에 추가"를 선택하세요.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-white">설정</h1>
      </div>

      {/* Stats summary */}
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
        {[
          { label: '저장된 메모', value: memoCount, color: '#6366f1' },
          { label: '감정 기록', value: emotionCount, color: '#8b5cf6' },
        ].map(s => (
          <div
            key={s.label}
            className="p-4 rounded-2xl text-center"
            style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notification settings */}
      <div className="mx-4 mb-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">알림</h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Morning briefing toggle */}
          <div
            className="flex items-center gap-3 p-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <Bell size={20} color="#818cf8" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">아침 브리핑</p>
              <p className="text-xs text-slate-500">매일 아침 할 일 알림</p>
            </div>
            <button
              onClick={toggleBriefing}
              className="relative w-12 h-6 rounded-full transition-all"
              style={{
                background: settings.morningBriefingEnabled ? '#6366f1' : 'rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md"
                style={{ left: settings.morningBriefingEnabled ? '26px' : '4px' }}
              />
            </button>
          </div>

          {/* Time picker */}
          <div className="flex items-center gap-3 p-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.10)' }}
            >
              <span className="text-xl">⏰</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">브리핑 시각</p>
              <p className="text-xs text-slate-500">알림 받을 시간 설정</p>
            </div>
            <input
              type="time"
              value={settings.morningBriefingTime}
              onChange={e => {
                updateSettings({ morningBriefingTime: e.target.value });
                if (settings.morningBriefingEnabled) {
                  scheduleMorningBriefing('오늘의 할 일을 확인하세요!', e.target.value);
                }
              }}
              className="text-sm font-mono text-indigo-400 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="mx-4 mb-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">데이터</h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={exportData}
            className="flex items-center gap-3 p-4 w-full text-left transition-all hover:bg-white/5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(52,211,153,0.12)' }}>
              <Download size={20} color="#34d399" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">데이터 내보내기</p>
              <p className="text-xs text-slate-500">JSON 파일로 백업</p>
            </div>
            <ChevronRight size={16} color="#475569" />
          </button>

          <button
            onClick={clearData}
            className="flex items-center gap-3 p-4 w-full text-left transition-all hover:bg-white/5"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <Trash2 size={20} color="#f87171" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">모든 데이터 삭제</p>
              <p className="text-xs text-slate-500">되돌릴 수 없어요</p>
            </div>
            <ChevronRight size={16} color="#475569" />
          </button>
        </div>
      </div>

      {/* Install app */}
      <div className="mx-4 mb-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">앱</h2>
        <button
          onClick={installApp}
          className="flex items-center gap-3 p-4 w-full rounded-2xl text-left transition-all"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-300">홈 화면에 설치</p>
            <p className="text-xs text-slate-500">앱처럼 사용할 수 있어요</p>
          </div>
          <ChevronRight size={16} color="#6366f1" />
        </button>
      </div>

      {/* App info */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-xs text-slate-600">플로팅 메모 v1.0.0</p>
        <p className="text-xs text-slate-700 mt-1">생각을 순간 포착하는 앱</p>
      </div>

      {saved && (
        <div
          className="fixed top-16 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-xl text-sm text-green-400 fade-in"
          style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', zIndex: 100 }}
        >
          ✓ 저장됨
        </div>
      )}
    </div>
  );
}
