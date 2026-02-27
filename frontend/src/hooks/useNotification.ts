import { useCallback, useEffect } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: () => void;
}

export const useNotification = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback((options: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/emergency-icon.svg',
        tag: options.tag,
        requireInteraction: options.requireInteraction || true,
        silent: options.silent || false,
        vibrate: [200, 100, 200],
      });

      if (options.onClick) {
        notification.onclick = options.onClick;
      }

      // Auto close after 10 seconds if not requireInteraction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [permission]);

  const showEmergencyNotification = useCallback((incidentId: string, driverName: string) => {
    return showNotification({
      title: '🚨 EMERGENCY ALERT',
      body: `New accident reported by ${driverName}. Immediate response required!`,
      tag: `emergency-${incidentId}`,
      requireInteraction: true,
      onClick: () => {
        window.focus();
        window.location.href = `/alert/${incidentId}`;
      },
    });
  }, [showNotification]);

  return {
    permission,
    requestPermission,
    showNotification,
    showEmergencyNotification,
  };
};