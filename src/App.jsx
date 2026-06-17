import { useState, useEffect, useCallback } from 'react';
import { Home, CheckSquare, Smile, Settings } from 'lucide-react';
import FloatingButton from './components/FloatingButton.jsx';
import MemoModal from './components/MemoModal.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import EmotionScreen from './components/EmotionScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import { useMemos, useEmotions, useSettings } from './hooks/useStorage.js';

const TABS = [
  { key: 'home', icon: Home, label: '홈' },
  { key: 'tasks', icon: CheckSquare, label: '할 일' },
  { key: 'emotion', icon: Smile, label: '감정' },
  { key: 'settings', icon: Settings, label: '설정' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showModal, setShowModal] = useState(false);

  const { memos, addMemo, updateMemo, deleteMemo, toggleDone } = useMemos();
  const { emotions, addEmotion, stats, weeklyTrend } = useEmotions();
  const { settings, updateSettings } = useSettings();

  // AI classification event listener
  useEffect(() => {
    const onClassified = (e) => {
      const results = e.detail;
      results.forEach(r => {
        if (r.id) {
          updateMemo(r.id, {
            priority: r.priority,
            category: r.category,
            tags: r.tags || [],
          });
        }
      });
    };
    window.addEventListener('ai-classified', onClassified);
    return () => window.removeEventListener('ai-classified', onClassified);
  }, [updateMemo]);

  // Toss in-app browser compatibility: prevent scroll bounce
  useEffect(() => {
    const preventDefault = (e) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, []);

  const handleSaveMemo = useCallback((memo) => {
    addMemo(memo);
  }, [addMemo]);

  const handleSaveEmotion = useCallback((emotion, note) => {
    addEmotion(emotion, note);
  }, [addEmotion]);

  // Task filter memos
  const taskMemos = memos.filter(m => m.type === 'task');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            memos={memos}
            onToggle={toggleDone}
            onDelete={deleteMemo}
          />
        );
      case 'tasks':
        return (
          <div className="flex flex-col h-full overflow-y-auto pb-24">
            <div className="px-4 pt-4 pb-2">
              <h1 className="text-lg font-bold text-white">할 일</h1>
              <p className="text-sm text-slate-400">
                {taskMemos.filter(m => !m.done).length}개 남음 • {taskMemos.filter(m => m.done).length}개 완료
              </p>
            </div>

            {/* Tasks */}
            <div className="px-4 pb-4">
              {/* Pending */}
              {taskMemos.filter(m => !m.done).length > 0 && (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-2">진행 중</p>
                  {taskMemos.filter(m => !m.done).map(memo => (
                    <TaskItem key={memo.id} memo={memo} onToggle={toggleDone} onDelete={deleteMemo} />
                  ))}
                </>
              )}

              {/* Done */}
              {taskMemos.filter(m => m.done).length > 0 && (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-4">완료됨</p>
                  {taskMemos.filter(m => m.done).map(memo => (
                    <TaskItem key={memo.id} memo={memo} onToggle={toggleDone} onDelete={deleteMemo} done />
                  ))}
                </>
              )}

              {taskMemos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">☑️</div>
                  <p className="text-slate-400 text-sm">할 일이 없어요<br /><span className="text-slate-600">+ 버튼으로 추가해보세요</span></p>
                </div>
              )}
            </div>
          </div>
        );
      case 'emotion':
        return (
          <EmotionScreen
            emotions={emotions}
            addEmotion={addEmotion}
            stats={stats}
            weeklyTrend={weeklyTrend}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            updateSettings={updateSettings}
            memoCount={memos.length}
            emotionCount={emotions.length}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status bar spacer */}
      <div style={{ height: 'env(safe-area-inset-top)', background: 'transparent' }} />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            ✏️
          </div>
          <span className="font-bold text-white">플로팅 메모</span>
        </div>

        {/* Online indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-slate-500">AI 연결됨</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {renderScreen()}
      </div>

      {/* Bottom navigation */}
      <div
        className="flex items-center"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          position: 'relative',
          zIndex: 30,
        }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-all"
              style={{ color: active ? '#818cf8' : '#475569' }}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className="text-xs font-medium">{tab.label}</span>
              {active && (
                <div
                  className="absolute bottom-0 rounded-full"
                  style={{
                    width: '20px',
                    height: '2px',
                    background: '#6366f1',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating action button */}
      <FloatingButton onClick={() => setShowModal(true)} />

      {/* Memo input modal */}
      {showModal && (
        <MemoModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveMemo}
          onSaveEmotion={handleSaveEmotion}
        />
      )}
    </div>
  );
}

// Task item component
function TaskItem({ memo, onToggle, onDelete, done }) {
  const PRIORITY_COLORS = {
    high: '#f87171',
    mid: '#fbbf24',
    low: '#34d399',
  };

  return (
    <div
      className="flex items-center gap-3 py-3 px-3 rounded-xl mb-2 transition-all"
      style={{
        background: done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
        opacity: done ? 0.5 : 1,
      }}
    >
      <button onClick={() => onToggle(memo.id)}>
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            borderColor: done ? '#6366f1' : '#334155',
            background: done ? '#6366f1' : 'transparent',
          }}
        >
          {done && <span className="text-white text-xs">✓</span>}
        </div>
      </button>

      <p
        className="flex-1 text-sm text-slate-200"
        style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#475569' : '#e2e8f0' }}
      >
        {memo.content}
      </p>

      {memo.priority && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: PRIORITY_COLORS[memo.priority] || '#475569' }}
        />
      )}

      <button onClick={() => onDelete(memo.id)} className="p-1 flex-shrink-0" style={{ color: '#334155' }}>
        <span className="text-xs">✕</span>
      </button>
    </div>
  );
}
