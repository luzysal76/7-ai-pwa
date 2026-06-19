import { useState, useCallback, useMemo } from 'react';
import { RefreshCw, TrendingUp, Award, BarChart2, BookOpen } from 'lucide-react';
import { WeatherHeatmap } from './EmotionWeather.jsx';
import { generateWeeklyReport, analyzePatterns, generatePatternMessage } from '../utils/ai.js';

export default function AnalyticsScreen({ memos, emotions, last30Days, reports, addReport, counselorMode }) {
  const [loading, setLoading] = useState(false);
  const [patternAlerts, setPatternAlerts] = useState([]);
  const [patternMessages, setPatternMessages] = useState({});
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  // P-1: now fixed at mount time — avoids new Date() on every render
  const now = useMemo(() => new Date(), []);

  // P-2: memoize all weekly aggregations
  const weekStart = useMemo(() => {
    const d = new Date(now); d.setDate(now.getDate() - 7); return d;
  }, [now]);

  const weekMemos = useMemo(
    () => memos.filter(m => new Date(m.createdAt) >= weekStart),
    [memos, weekStart]
  );

  const weekDone = useMemo(() => weekMemos.filter(m => m.done).length, [weekMemos]);
  const weekTotal = useMemo(() => weekMemos.filter(m => m.type === 'task').length, [weekMemos]);

  const weekEmotions = useMemo(
    () => emotions.filter(e => new Date(e.createdAt) >= weekStart),
    [emotions, weekStart]
  );

  const topEmotions = useMemo(() => {
    const emotionCount = {};
    weekEmotions.forEach(e => { emotionCount[e.emotion] = (emotionCount[e.emotion] || 0) + 1; });
    return Object.entries(emotionCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }, [weekEmotions]);

  const topKeywords = useMemo(() => {
    const wordCount = {};
    weekMemos
      .flatMap(m => m.content.split(/\s+/).filter(w => w.length > 1))
      .forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
    return Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  }, [weekMemos]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    const data = { doneTasks: weekDone, totalTasks: weekTotal, topEmotions, topKeywords };
    const text = await generateWeeklyReport(data, counselorMode);
    addReport({ text, weekOf: now.toDateString(), stats: data });
    setLoading(false);
  }, [weekDone, weekTotal, topEmotions, topKeywords, counselorMode, addReport, now]);

  const runPatternAnalysis = useCallback(async () => {
    setLoadingPatterns(true);
    const alerts = analyzePatterns(memos);
    setPatternAlerts(alerts);
    // Generate messages for each alert
    const msgs = {};
    for (const alert of alerts) {
      msgs[alert.pattern] = await generatePatternMessage(alert, counselorMode);
    }
    setPatternMessages(msgs);
    setLoadingPatterns(false);
  }, [memos, counselorMode]);

  // B-1: renamed 'alert' param to 'alertData' — was shadowing window.alert() causing TypeError
  const schedulePatternNotification = useCallback((alertData, msg) => {
    if (Notification.permission !== 'granted') return;
    const h = alertData.avgHour;
    const now2 = new Date();
    const target = new Date(); target.setHours(h, 0, 0, 0);
    if (target <= now2) target.setDate(target.getDate() + 1);
    const delay = target - now2;
    setTimeout(() => {
      new Notification(`💡 패턴 감지: ${alertData.pattern}`, {
        body: msg,
        icon: '/7-ai-pwa/icon-192.png',
        tag: 'pattern-' + alertData.pattern,
      });
    }, delay);
    window.alert('알림이 예약됐어요! 오늘 ' + h + '시에 알림을 드릴게요 💪');
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart2 size={20} color="#818cf8" /> 분석
        </h1>
        <p className="text-sm text-slate-400">이번 주 패턴과 통계</p>
      </div>

      {/* This week stats */}
      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        {[
          { label: '완료', value: weekDone, icon: '✅', color: '#34d399' },
          { label: '할 일', value: weekTotal, icon: '☑️', color: '#818cf8' },
          { label: '감정기록', value: weekEmotions.length, icon: '😊', color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-2xl text-center"
            style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly report */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={14} /> 주간 회고
          </h2>
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <TrendingUp size={12} />}
            생성
          </button>
        </div>

        {reports.length === 0 && !loading && (
          <div className="p-4 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p className="text-slate-500 text-sm">버튼을 눌러 이번 주 회고를 생성하세요</p>
          </div>
        )}

        {loading && (
          <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" color="#818cf8" />
            <p className="text-slate-400 text-sm">AI가 이번 주를 분석 중...</p>
          </div>
        )}

        {reports.slice(0, 3).map(r => (
          <div key={r.id} className="p-4 rounded-2xl mb-2"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Award size={14} color="#818cf8" />
              <span className="text-xs text-indigo-400 font-semibold">
                {new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 회고
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{r.text}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {r.stats?.topEmotions?.map(e => <span key={e} className="text-lg">{e}</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* Pattern analysis */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} /> 패턴 분석
          </h2>
          <button
            onClick={runPatternAnalysis}
            disabled={loadingPatterns}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
          >
            {loadingPatterns ? <RefreshCw size={12} className="animate-spin" /> : '🔍'}
            분석
          </button>
        </div>

        {patternAlerts.length === 0 && !loadingPatterns && (
          <div className="p-3 rounded-xl text-sm text-slate-500 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.07)' }}>
            최근 7일 메모를 분석해 패턴을 찾아드려요
          </div>
        )}

        {patternAlerts.map(pa => (
          <div key={pa.pattern} className="p-4 rounded-2xl mb-2"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-sm font-semibold text-yellow-400 mb-1">⚡ {pa.days}일 연속 "{pa.pattern}" 패턴</p>
            <p className="text-sm text-slate-300 leading-relaxed mb-2">
              {patternMessages[pa.pattern] || `평균 ${pa.avgHour}시경에 발생했어요.`}
            </p>
            {Notification.permission === 'granted' && (
              <button
                onClick={() => schedulePatternNotification(pa, patternMessages[pa.pattern] || '')}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
              >
                ⏰ {pa.avgHour}시 알림 예약
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Weather heatmap */}
      <div className="mx-4 mb-4">
        <WeatherHeatmap last30Days={last30Days} />
      </div>

      {/* Top keywords */}
      {topKeywords.length > 0 && (
        <div className="mx-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">이번 주 키워드</h2>
          <div className="flex flex-wrap gap-2">
            {topKeywords.map((k, i) => (
              <span key={k} className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  background: `rgba(99,102,241,${0.15 - i * 0.02})`,
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.25)',
                  fontSize: `${14 - i}px`,
                }}>
                #{k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
