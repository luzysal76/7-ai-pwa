// LocalStorage utilities with JSON serialization

const PREFIX = 'fm_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  }
};

// Memo operations
export const memoStorage = {
  getAll() {
    return storage.get('memos', []);
  },

  save(memos) {
    storage.set('memos', memos);
  },

  add(memo) {
    const memos = this.getAll();
    const newMemo = {
      id: Date.now().toString(),
      content: memo.content || '',
      type: memo.type || 'text', // 'text' | 'voice' | 'task'
      emotion: memo.emotion || null,
      tags: memo.tags || [],
      priority: memo.priority || null, // 'high' | 'mid' | 'low'
      category: memo.category || null,
      done: false,
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

  delete(id) {
    const memos = this.getAll().filter(m => m.id !== id);
    this.save(memos);
  },

  getTodayTasks() {
    const today = new Date().toDateString();
    return this.getAll().filter(m =>
      m.type === 'task' &&
      !m.done &&
      new Date(m.createdAt).toDateString() === today
    );
  }
};

// Emotion operations
export const emotionStorage = {
  getAll() {
    return storage.get('emotions', []);
  },

  add(emotion, note = '') {
    const emotions = this.getAll();
    emotions.push({
      id: Date.now().toString(),
      emotion,
      note,
      date: new Date().toDateString(),
      createdAt: new Date().toISOString(),
    });
    storage.set('emotions', emotions);
  },

  getStats() {
    const emotions = this.getAll();
    const stats = {};
    emotions.forEach(e => {
      stats[e.emotion] = (stats[e.emotion] || 0) + 1;
    });
    return stats;
  },

  getWeeklyTrend() {
    const emotions = this.getAll();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayEmotions = emotions.filter(e => e.date === dateStr);
      days.push({
        date: d,
        dateStr,
        emotions: dayEmotions,
        primary: dayEmotions[dayEmotions.length - 1]?.emotion || null,
      });
    }
    return days;
  }
};

// Settings
export const settingsStorage = {
  get() {
    return storage.get('settings', {
      morningBriefingEnabled: false,
      morningBriefingTime: '07:00',
      notificationsGranted: false,
      floatButtonSide: 'right',
    });
  },

  update(updates) {
    const current = this.get();
    storage.set('settings', { ...current, ...updates });
  }
};
