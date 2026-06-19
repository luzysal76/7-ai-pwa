import { useCallback } from 'react';
import { settingsStorage } from '../utils/storage.js';

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      settingsStorage.update({ notificationsGranted: true });
      return true;
    }
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      settingsStorage.update({ notificationsGranted: granted });
      return granted;
    }
    return false;
  }, []);

  const scheduleNotification = useCallback((title, body, delay = 0) => {
    if (Notification.permission !== 'granted') return;
    setTimeout(() => {
      new Notification(title, {
        body,
        icon: '/7-ai-pwa/icon-192.png',
        badge: '/7-ai-pwa/icon-192.png',
        tag: 'morning-briefing',
        requireInteraction: true,
        silent: false,
      });
    }, delay);
  }, []);

  // W-2: SW 메시지 기반 알림 — 탭 종료 후에도 SW가 살아있으면 동작
  const scheduleMorningBriefing = useCallback((message, timeStr = '07:00') => {
    if (Notification.permission !== 'granted') return;

    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;

    // Prefer SW-based scheduling (survives tab close)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: '🌅 오늘의 브리핑',
        body: message,
        delay,
        tag: 'morning-briefing',
      });
    } else {
      // Fallback: setTimeout (requires tab to stay open)
      console.log(`[알림] ${Math.round(delay / 60000)}분 후 브리핑 예약 (폴백 모드)`);
      setTimeout(() => scheduleNotification('🌅 오늘의 브리핑', message), delay);
    }
  }, [scheduleNotification]);

  return { requestPermission, scheduleNotification, scheduleMorningBriefing };
}
