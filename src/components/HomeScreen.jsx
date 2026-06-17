import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Trash2, Star, Sparkles, Bell, RefreshCw } from 'lucide-react';
import { classifyTasks, generateMorningBriefing } from '../utils/ai.js';

const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171', label: '긴급' },
  mid:  { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', label: '보통' },
  low:  { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', text: '#34d399', label: '여유' },
};

const TYPE_ICONS = {
  task: '☑️',
  voice: '🎙️',
  text: '📝',
};

function MemoCard({ memo, onToggle, onDelete }) {
  const p = memo.priority ? PRIORITY_COLORS[memo.priority] : null;

  return (
    <div
      className="fade-in rounded-2xl p-4 mb-3 transition-all"
      style={{
        background: memo.done
          ? 'rgba(255,255,255,0.03)'
          : p ? `${p.bg}` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${p ? p.border : 'rgba(255,255,255,0.08)'}`,
        opacity: memo.done ? 0.5 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Toggle button */}
        {memo.type === 'task' ? (
          <button onClick={() => onToggle(memo.id)} className="mt-0.5 flex-shrink-0">
            {memo.done
              ? <CheckCircle2 size={20} color="#6366f1" />
              : <Circle size={20} color="#475569" />
            }
          </button>
        ) : (
          <span className="mt-0.5 text-base flex-shrink-0">{TYPE_ICONS[memo.type] || '📝'}</span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm leading-relaxed break-words"
            style={{
              color: memo.done ? '#475569' : '#e2e8f0',
              textDecoration: memo.done ? 'line-through' : 'none',
            }}
          >
            {memo.emotion && <span className="mr-1">{memo.emotion}</span>}
            {memo.content}
          </p>

          {/* Tags & Priority */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {p && (
              <span
                className="tag-badge"
                style={{ background: p.bg, color: p.text, border: `1px solid ${p.border}` }}
              >
                {p.label}
              </span>
            )}
            {memo.category && (
              <span className="tag-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                {memo.category}
              </span>
            )}
            {memo.tags?.map(tag => (
              <span key={tag} className="tag-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                #{tag}
              </span>
            ))}
            <span className="text-xs text-slate-600 ml-auto">
              {new Date(memo.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(memo.id)}
          className="flex-shrink-0 p-1.5 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function HomeScreen({ memos, onToggle, onDelete }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'task' | 'text' | 'voice'
  const [briefing, setBriefing] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [classifiedIds, setClassifiedIds] = useState(new Set());

  const today = new Date().toDateString();
  const todayMemos = memos.filter(m => new Date(m.createdAt).toDateString() === today);
  const allMemos = filter === 'all' ? memos : memos.filter(m => m.type === filter);

  // AI 자동 분류
  const runAIClassification = async () => {
    setLoadingAI(true);
    const unclassified = memos.filter(m => !m.priority && m.content.length > 3);
    if (unclassified.length === 0) {
      setLoadingAI(false);
      return;
    }
    const input = unclassified.slice(0, 10).map(m => ({ id: m.id, content: m.content }));
    const results = await classifyTasks(input);
    setLoadingAI(false);

    if (results && results.length > 0) {
      // Store results - parent should handle this
      const ev = new CustomEvent('ai-classified', { detail: results });
      window.dispatchEvent(ev);
    }
  };

  // Morning briefing
  const generateBriefing = async () => {
    const tasks = todayMemos.filter(m => m.type === 'task' && !m.done);
    const text = await generateMorningBriefing(tasks);
    setBriefing(text);
  };

  // Today's stats
  const taskCount = todayMemos.filter(m => m.type === 'task').length;
  const doneCount = todayMemos.filter(m => m.type === 'task' && m.done).length;
  const memoCount = todayMemos.filter(m => m.type !== 'task').length;

  return (
    <div className="flex flex-col h-full">
      {/* Today summary */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-white">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h1>
          <button
            onClick={runAIClassification}
            disabled={loadingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            {loadingAI
              ? <RefreshCw size={12} className="animate-spin" />
              : <Sparkles size={12} />
            }
            AI 분류
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <span className="text-indigo-400 font-semibold">{doneCount}/{taskCount}</span>
            <span>할 일 완료</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <span className="text-purple-400 font-semibold">{memoCount}</span>
            <span>메모</span>
          </div>
        </div>
      </div>

      {/* Morning briefing */}
      {briefing && (
        <div
          className="mx-4 mb-3 p-3 rounded-xl text-sm leading-relaxed text-slate-300"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bell size={14} color="#818cf8" />
            <span className="text-xs font-semibold text-indigo-400">오늘의 브리핑</span>
          </div>
          {briefing}
        </div>
      )}

      {!briefing && taskCount > 0 && (
        <button
          onClick={generateBriefing}
          className="mx-4 mb-3 p-3 rounded-xl text-sm text-center transition-all"
          style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px dashed rgba(99,102,241,0.2)',
            color: '#6366f1',
          }}
        >
          ☀️ AI 브리핑 생성하기
        </button>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { key: 'all', label: `전체 ${memos.length}` },
          { key: 'task', label: `할 일 ${memos.filter(m=>m.type==='task').length}` },
          { key: 'text', label: `메모 ${memos.filter(m=>m.type==='text').length}` },
          { key: 'voice', label: `음성 ${memos.filter(m=>m.type==='voice').length}` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === f.key ? '#818cf8' : '#64748b',
              border: `1px solid ${filter === f.key ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Memo list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {allMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-slate-400 text-sm">
              아직 메모가 없어요<br />
              <span className="text-slate-600">아래 + 버튼을 눌러 첫 메모를 작성하세요</span>
            </p>
          </div>
        ) : (
          allMemos.map(memo => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
