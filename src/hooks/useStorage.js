import { useState, useMemo, useCallback } from 'react';
import { memoStorage, emotionStorage, settingsStorage, weatherStorage, reportStorage, templateStorage } from '../utils/storage.js';

export function useMemos() {
  const [memos, setMemos] = useState(() => memoStorage.getAll());

  const refresh = useCallback(() => setMemos(memoStorage.getAll()), []);

  // P-3: use functional updates to avoid extra localStorage reads
  const addMemo = useCallback((memo) => {
    const newMemo = memoStorage.add(memo);
    setMemos(prev => [newMemo, ...prev]);
    return newMemo;
  }, []);

  const updateMemo = useCallback((id, updates) => {
    memoStorage.update(id, updates);
    const ts = new Date().toISOString();
    setMemos(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: ts } : m));
  }, []);

  const deleteMemo = useCallback((id) => {
    memoStorage.delete(id);
    setMemos(prev => prev.filter(m => m.id !== id));
  }, []);

  const toggleDone = useCallback((id) => {
    setMemos(prev => {
      const memo = prev.find(m => m.id === id);
      if (!memo) return prev;
      const ts = new Date().toISOString();
      memoStorage.update(id, { done: !memo.done });
      return prev.map(m => m.id === id ? { ...m, done: !m.done, updatedAt: ts } : m);
    });
  }, []);

  const setFocusGoal = useCallback((id) => {
    memoStorage.setFocusGoal(id);
    setMemos(prev => prev.map(m => ({ ...m, isFocus: m.id === id })));
  }, []);

  // P-4: derive focusGoal from state — no extra localStorage read
  const focusGoal = useMemo(() => {
    const today = new Date().toDateString();
    return memos.find(m => m.isFocus && new Date(m.updatedAt).toDateString() === today) || null;
  }, [memos]);

  return { memos, addMemo, updateMemo, deleteMemo, toggleDone, setFocusGoal, focusGoal, refresh };
}

export function useEmotions() {
  const [emotions, setEmotions] = useState(() => emotionStorage.getAll());

  const addEmotion = useCallback((emotion, note = '') => {
    emotionStorage.add(emotion, note);
    setEmotions(emotionStorage.getAll());
  }, []);

  // P-4: memoize stats & weeklyTrend — previously re-computed on every render
  const stats = useMemo(() => {
    const s = {};
    emotions.forEach(e => { s[e.emotion] = (s[e.emotion] || 0) + 1; });
    return s;
  }, [emotions]);

  // Derive weeklyTrend directly from emotions state (no extra localStorage read)
  const weeklyTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayEmotions = emotions.filter(e => e.date === dateStr);
      days.push({ date: d, dateStr, emotions: dayEmotions, primary: dayEmotions[dayEmotions.length - 1]?.emotion || null });
    }
    return days;
  }, [emotions]);

  return { emotions, addEmotion, stats, weeklyTrend };
}

export function useWeather() {
  const [todayWeather, setTodayWeather] = useState(() => weatherStorage.getToday());

  const setWeather = useCallback((key) => {
    weatherStorage.setToday(key);
    setTodayWeather(key);
  }, []);

  return {
    todayWeather,
    setWeather,
    last30Days: weatherStorage.getLast30Days(),
  };
}

export function useReports() {
  const [reports, setReports] = useState(() => reportStorage.getAll());

  const addReport = useCallback((report) => {
    reportStorage.add(report);
    setReports(reportStorage.getAll());
  }, []);

  return { reports, addReport };
}

export function useTemplates() {
  const [templates, setTemplates] = useState(() => templateStorage.getAll());

  const updateTemplate = useCallback((id, updates) => {
    templateStorage.update(id, updates);
    setTemplates(templateStorage.getAll());
  }, []);

  return { templates, updateTemplate };
}

export function useSettings() {
  const [settings, setSettings] = useState(() => settingsStorage.get());

  const updateSettings = useCallback((updates) => {
    settingsStorage.update(updates);
    setSettings(settingsStorage.get());
  }, []);

  return { settings, updateSettings };
}
