import { useState, useCallback } from 'react';
import { memoStorage, emotionStorage, settingsStorage, weatherStorage, reportStorage, templateStorage } from '../utils/storage.js';

export function useMemos() {
  const [memos, setMemos] = useState(() => memoStorage.getAll());

  const refresh = useCallback(() => setMemos(memoStorage.getAll()), []);

  const addMemo = useCallback((memo) => {
    const newMemo = memoStorage.add(memo);
    setMemos(memoStorage.getAll());
    return newMemo;
  }, []);

  const updateMemo = useCallback((id, updates) => {
    memoStorage.update(id, updates);
    setMemos(memoStorage.getAll());
  }, []);

  const deleteMemo = useCallback((id) => {
    memoStorage.delete(id);
    setMemos(memoStorage.getAll());
  }, []);

  const toggleDone = useCallback((id) => {
    const memo = memoStorage.getAll().find(m => m.id === id);
    if (memo) {
      memoStorage.update(id, { done: !memo.done });
      setMemos(memoStorage.getAll());
    }
  }, []);

  const setFocusGoal = useCallback((id) => {
    memoStorage.setFocusGoal(id);
    setMemos(memoStorage.getAll());
  }, []);

  const focusGoal = memoStorage.getFocusGoal();

  return { memos, addMemo, updateMemo, deleteMemo, toggleDone, setFocusGoal, focusGoal, refresh };
}

export function useEmotions() {
  const [emotions, setEmotions] = useState(() => emotionStorage.getAll());

  const addEmotion = useCallback((emotion, note = '') => {
    emotionStorage.add(emotion, note);
    setEmotions(emotionStorage.getAll());
  }, []);

  return {
    emotions,
    addEmotion,
    stats: emotionStorage.getStats(),
    weeklyTrend: emotionStorage.getWeeklyTrend(),
  };
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
