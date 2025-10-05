import { timer } from 'rxjs';

/**
 * Pure notification transforms for adding/removing notifications from the stream
 */

export const addNotification = (notifications$, type, message) => {
  if (!notifications$) return;
  
  const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const notification = {
    id,
    type,
    message,
    timestamp: Date.now()
  };
  
  const currentNotifications = notifications$.value;
  notifications$.next([...currentNotifications, notification]);
  
  // Auto-close success and info notifications after 4 seconds
  if (type === 'success' || type === 'info') {
    timer(3000).subscribe(() => {
      const currentNotifications = notifications$.value;
      notifications$.next(currentNotifications.filter(n => n.id !== id));
    });
  }
  
  return id;
};

export const removeNotification = (notifications$, id) => {
  if (!notifications$) return;
  
  const currentNotifications = notifications$.value;
  notifications$.next(currentNotifications.filter(n => n.id !== id));
};