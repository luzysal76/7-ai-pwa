import { useEffect, useCallback } from 'react';
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

  // Schedule morning briefing
  const scheduleMorningBriefing = useCallback((message, timeStr = '07:00') => {
    if (Notification.permission !== 'granted') return;

    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // If already past today's time, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target - now;
    console.log(`Morning briefing scheduled in ${Math.round(delay / 60000)} minutes`);

    setTimeout(() => {
      scheduleNotification('🌅 오늘의 브리핑', message);
    }, delay);
  }, [scheduleNotification]);

  return { requestPermission, scheduleNotification, scheduleMorningBriefing };
}
