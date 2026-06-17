import { useState, useCallback } from 'react';
import { memoStorage, emotionStorage, settingsStorage } from '../utils/storage.js';

export function useMemos() {
  const [memos, setMemos] = useState(() => memoStorage.getAll());

  const refresh = useCallback(() => {
    setMemos(memoStorage.getAll());
  }, []);

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
    const memo = memos.find(m => m.id === id);
    if (memo) {
      memoStorage.update(id, { done: !memo.done });
      setMemos(memoStorage.getAll());
    }
  }, [memos]);

  return { memos, addMemo, updateMemo, deleteMemo, toggleDone, refresh };
}

export function useEmotions() {
  const [emotions, setEmotions] = useState(() => emotionStorage.getAll());

  const addEmotion = useCallback((emotion, note = '') => {
    emotionStorage.add(emotion, note);
    setEmotions(emotionStorage.getAll());
  }, []);

  const stats = emotionStorage.getStats();
  const weeklyTrend = emotionStorage.getWeeklyTrend();

  return { emotions, addEmotion, stats, weeklyTrend };
}

export function useSettings() {
  const [settings, setSettings] = useState(() => settingsStorage.get());

  const updateSettings = useCallback((updates) => {
    settingsStorage.update(updates);
    setSettings(settingsStorage.get());
  }, []);

  return { settings, updateSettings };
}
