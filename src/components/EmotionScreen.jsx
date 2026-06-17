import { useState } from 'react';

const EMOTIONS = [
  { emoji: '😊', label: '행복', color: '#fbbf24' },
  { emoji: '😐', label: '보통', color: '#94a3b8' },
  { emoji: '😔', label: '슬픔', color: '#60a5fa' },
  { emoji: '😠', label: '화남', color: '#f87171' },
  { emoji: '😰', label: '불안', color: '#a78bfa' },
  { emoji: '🥰', label: '설렘', color: '#fb7185' },
  { emoji: '😴', label: '피곤', color: '#64748b' },
  { emoji: '💪', label: '의욕', color: '#34d399' },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function EmotionScreen({ emotions, addEmotion, stats, weeklyTrend }) {
  const [note, setNote] = useState('');
  const [todayEmotion, setTodayEmotion] = useState(null);
  const [saved, setSaved] = useState(false);

  // Today's emotions
  const today = new Date().toDateString();
  const todayEmotions = emotions.filter(e => e.date === today);
  const latestToday = todayEmotions[todayEmotions.length - 1];

  const handleSave = () => {
    if (!todayEmotion) return;
    addEmotion(todayEmotion.emoji, note);
    setSaved(true);
    setNote('');
    setTimeout(() => setSaved(false), 2000);
  };

  // Stats
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-white">감정 기록</h1>
        <p className="text-sm text-slate-400">
          {latestToday ? `오늘: ${latestToday.emotion} 기분` : '오늘의 감정을 기록해보세요'}
        </p>
      </div>

      {/* Today's emotion picker */}
      <div
        className="mx-4 mb-4 p-4 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm font-medium text-slate-300 mb-3">지금 기분은?</p>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {EMOTIONS.map(e => (
            <button
              key={e.emoji}
              onClick={() => setTodayEmotion(e)}
              className="emotion-btn flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all"
              style={{
                background: todayEmotion?.emoji === e.emoji
                  ? `${e.color}22`
                  : 'rgba(255,255,255,0.04)',
                border: `2px solid ${todayEmotion?.emoji === e.emoji ? e.color : 'transparent'}`,
              }}
            >
              <span className="text-2xl">{e.emoji}</span>
              <span className="text-xs text-slate-400">{e.label}</span>
            </button>
          ))}
        </div>

        {todayEmotion && (
          <>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="한 줄 메모 (선택)"
              className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none py-2 px-3 rounded-xl mb-3"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
            />
            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: saved
                  ? 'rgba(52,211,153,0.2)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: saved ? '#34d399' : 'white',
                border: saved ? '1px solid rgba(52,211,153,0.3)' : 'none',
              }}
            >
              {saved ? '✓ 저장됨' : `${todayEmotion.emoji} ${todayEmotion.label} 기록하기`}
            </button>
          </>
        )}
      </div>

      {/* Weekly trend */}
      <div className="mx-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">이번 주 감정</h2>
        <div className="flex gap-1">
          {weeklyTrend.map((day, i) => {
            const emotionData = EMOTIONS.find(e => e.emoji === day.primary);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all"
                  style={{
                    background: day.primary
                      ? `${emotionData?.color || '#6366f1'}15`
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${day.primary ? `${emotionData?.color || '#6366f1'}30` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span>{day.primary || ''}</span>
                </div>
                <span
                  className="text-xs"
                  style={{
                    color: day.dateStr === today ? '#818cf8' : '#475569',
                    fontWeight: day.dateStr === today ? '700' : '400',
                  }}
                >
                  {DAY_LABELS[day.date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="mx-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">감정 통계</h2>
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {sorted.map(([emoji, count]) => {
              const e = EMOTIONS.find(em => em.emoji === emoji);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={emoji} className="flex items-center gap-3 mb-3 last:mb-0">
                  <span className="text-xl w-8 text-center">{emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{e?.label || emoji}</span>
                      <span className="text-slate-500">{count}회 ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: e ? `linear-gradient(90deg, ${e.color}cc, ${e.color})` : '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-600 text-center mt-2">
            총 {total}개의 감정 기록
          </p>
        </div>
      )}

      {/* Recent emotion logs */}
      {emotions.length > 0 && (
        <div className="mx-4">
          <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">최근 기록</h2>
          {[...emotions].reverse().slice(0, 10).map(e => (
            <div
              key={e.id}
              className="flex items-start gap-3 py-3 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <span className="text-2xl">{e.emotion}</span>
              <div className="flex-1">
                {e.note && <p className="text-sm text-slate-300">{e.note}</p>}
                <p className="text-xs text-slate-600 mt-0.5">
                  {new Date(e.createdAt).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {emotions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-5xl mb-4">🌈</div>
          <p className="text-slate-400 text-sm">감정을 기록하면 통계가 표시돼요</p>
        </div>
      )}
    </div>
  );
}
