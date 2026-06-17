// LocalStorage utilities with JSON serialization
const PREFIX = 'fm_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch (e) { console.error('Storage error:', e); }
  },
  remove(key) { localStorage.removeItem(PREFIX + key); }
};

// ── Memo ──────────────────────────────────────────
export const memoStorage = {
  getAll() { return storage.get('memos', []); },
  save(memos) { storage.set('memos', memos); },
  add(memo) {
    const memos = this.getAll();
    const newMemo = {
      id: Date.now().toString(),
      content: memo.content || '',
      type: memo.type || 'text',
      emotion: memo.emotion || null,
      tags: memo.tags || [],
      priority: memo.priority || null,
      category: memo.category || null,
      done: false,
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memos.unshift(newMemo);
    this.save(memos);
    return newMemo;
  },
  update(id, updates) {
    const memos = this.getAll();
    const idx = memos.findIndex(m => m.id === id);
    if (idx !== -1) {
      memos[idx] = { ...memos[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save(memos);
    }
  },
  delete(id) { this.save(this.getAll().filter(m => m.id !== id)); },
  getTodayTasks() {
    const today = new Date().toDateString();
    return this.getAll().filter(m =>
      m.type === 'task' && !m.done && new Date(m.createdAt).toDateString() === today
    );
  },
  getFocusGoal() {
    const today = new Date().toDateString();
    return this.getAll().find(m => m.isFocus && new Date(m.updatedAt).toDateString() === today) || null;
  },
  setFocusGoal(id) {
    const memos = this.getAll();
    memos.forEach(m => { m.isFocus = m.id === id; });
    this.save(memos);
  }
};

// ── Emotion ───────────────────────────────────────
export const emotionStorage = {
  getAll() { return storage.get('emotions', []); },
  add(emotion, note = '') {
    const emotions = this.getAll();
    emotions.push({ id: Date.now().toString(), emotion, note, date: new Date().toDateString(), createdAt: new Date().toISOString() });
    storage.set('emotions', emotions);
  },
  getStats() {
    const stats = {};
    this.getAll().forEach(e => { stats[e.emotion] = (stats[e.emotion] || 0) + 1; });
    return stats;
  },
  getWeeklyTrend() {
    const emotions = this.getAll();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayEmotions = emotions.filter(e => e.date === dateStr);
      days.push({ date: d, dateStr, emotions: dayEmotions, primary: dayEmotions[dayEmotions.length - 1]?.emotion || null });
    }
    return days;
  }
};

// ── Weather ───────────────────────────────────────
export const weatherStorage = {
  getAll() { return storage.get('weather', []); },
  setToday(weatherKey) {
    const list = this.getAll();
    const today = new Date().toDateString();
    const idx = list.findIndex(w => w.date === today);
    if (idx !== -1) list[idx].weather = weatherKey;
    else list.push({ date: today, weather: weatherKey });
    storage.set('weather', list);
  },
  getToday() {
    const today = new Date().toDateString();
    return this.getAll().find(w => w.date === today)?.weather || null;
  },
  getLast30Days() {
    const list = this.getAll();
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      result.push({ date: d, dateStr, weather: list.find(w => w.date === dateStr)?.weather || null });
    }
    return result;
  }
};

// ── Weekly Reports ────────────────────────────────
export const reportStorage = {
  getAll() { return storage.get('reports', []); },
  add(report) {
    const reports = this.getAll();
    reports.unshift({ id: Date.now().toString(), ...report, createdAt: new Date().toISOString() });
    storage.set('reports', reports.slice(0, 10)); // keep last 10
  }
};

// ── Templates ────────────────────────────────────
export const templateStorage = {
  getAll() {
    return storage.get('templates', [
      { id: '1', icon: '📝', label: '오늘 할 일', type: 'task' },
      { id: '2', icon: '🎯', label: '집중 목표', type: 'focus' },
      { id: '3', icon: '🎙️', label: '음성 메모', type: 'voice' },
    ]);
  },
  save(templates) { storage.set('templates', templates); },
  update(id, updates) {
    const templates = this.getAll();
    const idx = templates.findIndex(t => t.id === id);
    if (idx !== -1) templates[idx] = { ...templates[idx], ...updates };
    this.save(templates);
  }
};

// ── Pattern Analysis ──────────────────────────────
export const patternStorage = {
  get() { return storage.get('patterns', { lastAnalyzed: null, detected: [] }); },
  save(data) { storage.set('patterns', data); }
};

// ── Settings (extended) ───────────────────────────
export const settingsStorage = {
  get() {
    return storage.get('settings', {
      // Notification
      morningBriefingEnabled: false,
      morningBriefingTime: '07:00',
      notificationsGranted: false,
      // Widget
      btnSize: 56,
      btnOpacity: 90,
      snapToCorner: true,
      autoHideDelay: 5,  // seconds, 0 = off
      // Mode
      simpleMode: false,
      counselorMode: false,
      // DND
      dndEnabled: false,
      dndStart: '22:00',
      dndEnd: '08:00',
      pomodoroMinutes: 25,
    });
  },
  update(updates) {
    const current = this.get();
    storage.set('settings', { ...current, ...updates });
  }
};
