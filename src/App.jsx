import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, CheckSquare, Smile, Settings, BarChart2 } from 'lucide-react';
import FloatingButton from './components/FloatingButton.jsx';
import MemoModal from './components/MemoModal.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import EmotionScreen from './components/EmotionScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import AnalyticsScreen from './components/AnalyticsScreen.jsx';
import AIConsentModal from './components/AIConsentModal.jsx'; // S-1
import { PRIORITY_COLORS } from './constants/priority.js'; // Q-1
import { useMemos, useEmotions, useSettings, useWeather, useReports, useTemplates } from './hooks/useStorage.js';

const TABS = [
  { key: 'home',     icon: Home,       label: '홈' },
  { key: 'tasks',    icon: CheckSquare, label: '할 일' },
  { key: 'emotion',  icon: Smile,       label: '감정' },
  { key: 'analytics',icon: BarChart2,   label: '분석' },
  { key: 'settings', icon: Settings,    label: '설정' },
];

// Pomodoro timer hook
function usePomodoroHide(minutes, triggerRef) {
  const [pomodoroHidden, setPomodoroHidden] = useState(false);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPomodoroHidden(true);
    timerRef.current = setTimeout(() => {
      setPomodoroHidden(false);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, (minutes || 25) * 60 * 1000);
  }, [minutes]);

  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
    setPomodoroHidden(false);
  }, []);

  triggerRef.current = { start, stop };
  return pomodoroHidden;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('normal'); // 'normal' | 'voice' | 'task' | 'focus'
  const [showConsent, setShowConsent] = useState(false); // S-1

  const { memos, addMemo, updateMemo, deleteMemo, toggleDone, setFocusGoal, focusGoal } = useMemos();
  const { emotions, addEmotion, stats, weeklyTrend } = useEmotions();
  const { settings, updateSettings } = useSettings();

  // S-1: show consent on first launch if not yet consented
  useEffect(() => {
    if (!settings.aiConsented) setShowConsent(true);
  }, []); // eslint-disable-line
  const { todayWeather, setWeather, last30Days } = useWeather();
  const { reports, addReport } = useReports();
  const { templates, updateTemplate } = useTemplates();

  const pomodoroTrigger = useRef({});
  const pomodoroHidden = usePomodoroHide(settings.pomodoroMinutes, pomodoroTrigger);

  // AI classification result handler
  useEffect(() => {
    const onClassified = (e) => {
      e.detail.forEach(r => {
        if (r.id) updateMemo(r.id, { priority: r.priority, category: r.category, tags: r.tags || [] });
      });
    };
    window.addEventListener('ai-classified', onClassified);
    return () => window.removeEventListener('ai-classified', onClassified);
  }, [updateMemo]);

  // Drop zone handler (from floating button)
  useEffect(() => {
    const onDrop = (e) => {
      const zone = e.detail;
      const topMemo = memos.find(m => !m.done);
      if (!topMemo) return;
      if (zone === 'delete') deleteMemo(topMemo.id);
      else if (zone === 'complete') toggleDone(topMemo.id);
    };
    window.addEventListener('float-dropzone', onDrop);
    return () => window.removeEventListener('float-dropzone', onDrop);
  }, [memos, deleteMemo, toggleDone]);

  // Toss in-app browser: prevent pinch zoom
  useEffect(() => {
    const fn = (e) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener('touchmove', fn, { passive: false });
    return () => document.removeEventListener('touchmove', fn);
  }, []);

  // Floating button click handler
  const handleFloatClick = useCallback((type, tpl) => {
    if (type === 'voice') {
      setModalMode('voice');
    } else if (type === 'task') {
      setModalMode('task');
    } else if (type === 'focus') {
      setModalMode('focus');
    } else {
      setModalMode('normal');
    }
    setShowModal(true);
  }, []);

  const handleSaveMemo = useCallback((memo) => {
    const newMemo = addMemo(memo);
    // If focus mode, set as focus goal
    if (modalMode === 'focus' && newMemo) setFocusGoal(newMemo.id);
  }, [addMemo, modalMode, setFocusGoal]);

  const handleSaveEmotion = useCallback((emotion, note) => {
    addEmotion(emotion, note);
  }, [addEmotion]);

  const taskMemos = memos.filter(m => m.type === 'task');

  // Simple mode: just floating button, minimal overlay
  if (settings.simpleMode) {
    return (
      <div className="flex flex-col" style={{ minHeight: '100dvh', background: 'linear-gradient(180deg,#0f172a,#0a0f1e)' }}>
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-bold text-white text-sm">✏️ 플로팅 메모</span>
          <button onClick={() => updateSettings({ simpleMode: false })} className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded-lg">전체 모드</button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-600 text-sm text-center">플로팅 버튼을 눌러<br />메모를 작성하세요</p>
        </div>
        <FloatingButton onClick={handleFloatClick} templates={templates} settings={settings} />
        {showModal && (
          <MemoModal initialMode={modalMode} onClose={() => setShowModal(false)} onSave={handleSaveMemo} onSaveEmotion={handleSaveEmotion} />
        )}
        {showConsent && (
          <AIConsentModal
            onAccept={() => { updateSettings({ aiConsented: true }); setShowConsent(false); }}
            onDecline={() => { updateSettings({ aiConsented: false }); setShowConsent(false); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: 'linear-gradient(180deg,#0f172a 0%,#0a0f1e 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Status bar */}
      <div style={{ height: 'env(safe-area-inset-top)', background: 'transparent' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>✏️</div>
          <span className="font-bold text-white">플로팅 메모</span>
          {settings.counselorMode && <span className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>상담사 모드</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Pomodoro button */}
          <button
            onClick={() => pomodoroHidden ? pomodoroTrigger.current.stop?.() : pomodoroTrigger.current.start?.()}
            className="text-xs px-2 py-1 rounded-lg transition-all"
            style={{ background: pomodoroHidden ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: pomodoroHidden ? '#f87171' : '#64748b', border: `1px solid ${pomodoroHidden ? 'rgba(239,68,68,0.3)' : 'transparent'}` }}
          >
            {pomodoroHidden ? `🍅 집중 중` : '🍅'}
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-slate-500">AI</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {activeTab === 'home' && (
          <HomeScreen memos={memos} onToggle={toggleDone} onDelete={deleteMemo}
            onSetFocus={setFocusGoal} focusGoal={focusGoal}
            todayWeather={todayWeather} onWeatherSelect={setWeather}
            counselorMode={settings.counselorMode}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksScreen memos={taskMemos} onToggle={toggleDone} onDelete={deleteMemo} onSetFocus={setFocusGoal} focusGoal={focusGoal} />
        )}
        {activeTab === 'emotion' && (
          <EmotionScreen emotions={emotions} addEmotion={addEmotion} stats={stats} weeklyTrend={weeklyTrend} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsScreen memos={memos} emotions={emotions} last30Days={last30Days}
            reports={reports} addReport={addReport} counselorMode={settings.counselorMode}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen settings={settings} updateSettings={updateSettings}
            templates={templates} updateTemplate={updateTemplate}
            memoCount={memos.length} emotionCount={emotions.length}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center relative" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 30 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-all"
              style={{ color: active ? '#818cf8' : '#475569' }}>
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-xs font-medium">{tab.label}</span>
              {active && <div className="absolute bottom-0 rounded-full" style={{ width: 20, height: 2, background: '#6366f1' }} />}
            </button>
          );
        })}
      </div>

      {/* Floating button */}
      {!pomodoroHidden && (
        <FloatingButton onClick={handleFloatClick} templates={templates} settings={settings} />
      )}

      {/* Memo modal */}
      {showModal && (
        <MemoModal initialMode={modalMode} onClose={() => setShowModal(false)} onSave={handleSaveMemo} onSaveEmotion={handleSaveEmotion} />
      )}

      {/* S-1: AI 개인정보 동의 모달 (첫 실행 시) */}
      {showConsent && (
        <AIConsentModal
          onAccept={() => { updateSettings({ aiConsented: true }); setShowConsent(false); }}
          onDecline={() => { updateSettings({ aiConsented: false }); setShowConsent(false); }}
        />
      )}
    </div>
  );
}

// Tasks Screen
function TasksScreen({ memos, onToggle, onDelete, onSetFocus, focusGoal }) {
  const pending = memos.filter(m => !m.done);
  const done = memos.filter(m => m.done);
  const P = { high: '#f87171', mid: '#fbbf24', low: '#34d399' };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-white">할 일</h1>
        <p className="text-sm text-slate-400">{pending.length}개 남음 • {done.length}개 완료</p>
      </div>
      <div className="px-4">
        {pending.length > 0 && (
          <><p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-2">진행 중</p>
          {pending.map(m => <TaskItem key={m.id} memo={m} onToggle={onToggle} onDelete={onDelete} onSetFocus={onSetFocus} isFocus={focusGoal?.id === m.id} />)}</>
        )}
        {done.length > 0 && (
          <><p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-4">완료됨</p>
          {done.map(m => <TaskItem key={m.id} memo={m} onToggle={onToggle} onDelete={onDelete} done />)}</>
        )}
        {memos.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4">☑️</div>
            <p className="text-slate-400 text-sm">할 일이 없어요<br /><span className="text-slate-600">+ 버튼으로 추가해보세요</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({ memo, onToggle, onDelete, onSetFocus, isFocus, done }) {
  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-xl mb-2 transition-all"
      style={{ background: isFocus ? 'rgba(99,102,241,0.12)' : done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isFocus ? 'rgba(99,102,241,0.3)' : done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`, opacity: done ? 0.5 : 1 }}>
      <button onClick={() => onToggle(memo.id)}>
        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: done ? '#6366f1' : '#334155', background: done ? '#6366f1' : 'transparent' }}>
          {done && <span className="text-white text-xs">✓</span>}
        </div>
      </button>
      <p className="flex-1 text-sm" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#475569' : '#e2e8f0' }}>
        {isFocus && '🎯 '}{memo.content}
      </p>
      {memo.priority && <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[memo.priority]?.text || '#475569' }} />}
      {onSetFocus && !done && (
        <button onClick={() => onSetFocus(memo.id)} style={{ color: isFocus ? '#6366f1' : '#334155', fontSize: 14 }}>🎯</button>
      )}
      <button onClick={() => onDelete(memo.id)} style={{ color: '#334155', fontSize: 12 }}>✕</button>
    </div>
  );
}
