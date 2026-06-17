import { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Circle, RefreshCw, Sparkles, Bell, Volume2, VolumeX, Target } from 'lucide-react';
import SwipeableCard from './SwipeableCard.jsx';
import { WeatherWidget } from './EmotionWeather.jsx';
import { classifyTasks, generateMorningBriefing } from '../utils/ai.js';

const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171', label: '긴급' },
  mid:  { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', label: '보통' },
  low:  { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', text: '#34d399', label: '여유' },
};

const TYPE_ICONS = { task: '☑️', voice: '🎙️', text: '📝' };

// TTS speak
function speak(text) {
  window.speechSynthesis?.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.95;
  window.speechSynthesis?.speak(utt);
}

function MemoCard({ memo, onToggle, onDelete, onSetFocus, isFocus }) {
  const p = memo.priority ? PRIORITY_COLORS[memo.priority] : null;
  return (
    <SwipeableCard
      onDelete={() => onDelete(memo.id)}
      onComplete={memo.type === 'task' ? () => onToggle(memo.id) : null}
      className="mb-3"
    >
      <div
        className="rounded-2xl p-4 transition-all"
        style={{
          background: isFocus ? 'rgba(99,102,241,0.12)' : memo.done ? 'rgba(255,255,255,0.03)' : p ? p.bg : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isFocus ? 'rgba(99,102,241,0.4)' : p ? p.border : 'rgba(255,255,255,0.08)'}`,
          opacity: memo.done ? 0.55 : 1,
        }}
      >
        <div className="flex items-start gap-3">
          {memo.type === 'task' ? (
            <button onClick={() => onToggle(memo.id)} className="mt-0.5 flex-shrink-0">
              {memo.done ? <CheckCircle2 size={20} color="#6366f1" /> : <Circle size={20} color="#475569" />}
            </button>
          ) : (
            <span className="mt-0.5 text-base flex-shrink-0">{TYPE_ICONS[memo.type] || '📝'}</span>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed break-words"
              style={{ color: memo.done ? '#475569' : '#e2e8f0', textDecoration: memo.done ? 'line-through' : 'none' }}>
              {memo.emotion && <span className="mr-1">{memo.emotion}</span>}
              {memo.content}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {isFocus && (
                <span className="tag-badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                  🎯 집중 목표
                </span>
              )}
              {p && <span className="tag-badge" style={{ background: p.bg, color: p.text, border: `1px solid ${p.border}` }}>{p.label}</span>}
              {memo.category && <span className="tag-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{memo.category}</span>}
              {memo.tags?.map(tag => (
                <span key={tag} className="tag-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>#{tag}</span>
              ))}
              <span className="text-xs text-slate-600 ml-auto">
                {new Date(memo.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Focus goal button */}
          {!memo.done && (
            <button
              onClick={() => onSetFocus(memo.id)}
              className="flex-shrink-0 p-1.5 rounded-lg transition-all"
              style={{ color: isFocus ? '#6366f1' : '#334155', opacity: isFocus ? 1 : 0.5 }}
              title="집중 목표로 설정"
            >
              <Target size={15} />
            </button>
          )}
        </div>
      </div>
    </SwipeableCard>
  );
}

export default function HomeScreen({ memos, onToggle, onDelete, onSetFocus, focusGoal, todayWeather, onWeatherSelect, counselorMode }) {
  const [filter, setFilter] = useState('all');
  const [briefing, setBriefing] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [briefingShown, setBriefingShown] = useState(false);

  const today = new Date().toDateString();
  const todayMemos = memos.filter(m => new Date(m.createdAt).toDateString() === today);
  const taskCount = todayMemos.filter(m => m.type === 'task').length;
  const doneCount = todayMemos.filter(m => m.type === 'task' && m.done).length;

  const allMemos = filter === 'all' ? memos : memos.filter(m => m.type === filter);

  // Auto-show briefing once
  useEffect(() => {
    if (!briefingShown && taskCount > 0) {
      setBriefingShown(true);
      handleGenerateBriefing();
    }
  }, []); // eslint-disable-line

  const handleGenerateBriefing = useCallback(async () => {
    setLoadingBriefing(true);
    const tasks = todayMemos.filter(m => m.type === 'task' && !m.done);
    const text = await generateMorningBriefing(tasks, counselorMode);
    setBriefing(text);
    setLoadingBriefing(false);
  }, [todayMemos, counselorMode]);

  const toggleSpeak = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else if (briefing) {
      setIsSpeaking(true);
      speak(briefing);
      const id = setInterval(() => {
        if (!window.speechSynthesis?.speaking) { setIsSpeaking(false); clearInterval(id); }
      }, 500);
    }
  }, [isSpeaking, briefing]);

  const runAIClassification = useCallback(async () => {
    setLoadingAI(true);
    const unclassified = memos.filter(m => !m.priority && m.content.length > 2).slice(0, 10);
    if (unclassified.length === 0) { setLoadingAI(false); return; }
    const results = await classifyTasks(unclassified.map(m => ({ id: m.id, content: m.content })));
    if (results?.length) window.dispatchEvent(new CustomEvent('ai-classified', { detail: results }));
    setLoadingAI(false);
  }, [memos]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-white">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h1>
          <button onClick={runAIClassification} disabled={loadingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            {loadingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI 분류
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-sm text-slate-400">
          <span><span className="text-indigo-400 font-semibold">{doneCount}/{taskCount}</span> 완료</span>
          <span className="text-slate-700">•</span>
          <span><span className="text-purple-400 font-semibold">{todayMemos.filter(m => m.type !== 'task').length}</span> 메모</span>
          {focusGoal && <span className="text-slate-700">•</span>}
          {focusGoal && <span className="text-xs text-indigo-400 truncate max-w-32">🎯 {focusGoal.content.slice(0, 20)}</span>}
        </div>
      </div>

      {/* Weather widget */}
      <WeatherWidget todayWeather={todayWeather} onSelect={onWeatherSelect} />

      {/* Briefing */}
      {(briefing || loadingBriefing) && (
        <div className="mx-4 mb-3 p-3 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-center gap-1.5 mb-1.5 justify-between">
            <div className="flex items-center gap-1.5">
              <Bell size={14} color="#818cf8" />
              <span className="text-xs font-semibold text-indigo-400">오늘의 브리핑</span>
            </div>
            {briefing && (
              <button onClick={toggleSpeak}
                className="p-1 rounded-lg"
                style={{ color: isSpeaking ? '#f87171' : '#64748b' }}>
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
          </div>
          {loadingBriefing
            ? <div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw size={14} className="animate-spin" /> AI가 분석 중...</div>
            : <p className="text-sm text-slate-300 leading-relaxed">{briefing}</p>
          }
        </div>
      )}

      {!briefing && !loadingBriefing && taskCount > 0 && (
        <button onClick={handleGenerateBriefing}
          className="mx-4 mb-3 py-2.5 rounded-xl text-sm text-center"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.2)', color: '#6366f1' }}>
          ☀️ AI 브리핑 생성
        </button>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { key: 'all', label: `전체 ${memos.length}` },
          { key: 'task', label: `할 일 ${memos.filter(m => m.type === 'task').length}` },
          { key: 'text', label: `메모 ${memos.filter(m => m.type === 'text').length}` },
          { key: 'voice', label: `음성 ${memos.filter(m => m.type === 'voice').length}` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === f.key ? '#818cf8' : '#64748b',
              border: `1px solid ${filter === f.key ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Memo list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {allMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-slate-400 text-sm">아직 메모가 없어요<br /><span className="text-slate-600">+ 버튼으로 첫 메모를 작성하세요</span></p>
            <p className="text-xs text-slate-700 mt-2">← 스와이프하면 삭제 · 스와이프하면 완료 →</p>
          </div>
        ) : (
          allMemos.map(memo => (
            <MemoCard key={memo.id} memo={memo}
              onToggle={onToggle} onDelete={onDelete}
              onSetFocus={onSetFocus}
              isFocus={focusGoal?.id === memo.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
