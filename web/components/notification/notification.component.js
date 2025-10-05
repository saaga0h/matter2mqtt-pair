import { of } from 'rxjs';
import { escapeHtml } from '../../utils.js';

/**
 * Pure notification component following reactive patterns
 * Handles four states: success, info, warning, error
 * Auto-closes success/info after timeout, requires manual close for warning/error
 */

// Track previously rendered notifications to avoid re-animating existing ones
let previousNotifications = [];

export function notificationComponent(notifications, context) {
    if (!notifications || notifications.length === 0) {
        previousNotifications = [];
        return {
            html: '<div class="notifications-container"></div>',
            on: {}
        };
    }
    
    // Determine which notifications are new (for animation)
    const currentIds = new Set(notifications.map(n => n.id));
    const previousIds = new Set(previousNotifications.map(n => n.id));
    const newNotificationIds = new Set([...currentIds].filter(id => !previousIds.has(id)));
    
    // Update previous notifications reference
    previousNotifications = [...notifications];
    
    function renderNotification(notification) {
        const { id, type, message, timestamp } = notification;
        const canAutoClose = type === 'success' || type === 'info';
        const showCloseButton = type === 'warning' || type === 'error' || !canAutoClose;
        const isNew = newNotificationIds.has(id);
        
        return `
            <div class="notification notification--${type} ${isNew ? 'notification--entering' : ''}" data-notification-id="${id}">
                <div class="notification__content">
                    <div class="notification__icon">
                        ${getNotificationIcon(type)}
                    </div>
                    <div class="notification__message">
                        ${escapeHtml(message)}
                    </div>
                    ${showCloseButton ? `
                        <button class="notification__close" data-action="close-notification" data-notification-id="${id}" aria-label="Close notification">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M12 4.5L8 8.5L4 4.5L3.5 5L7.5 9L3.5 13L4 13.5L8 9.5L12 13.5L12.5 13L8.5 9L12.5 5L12 4.5Z"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    function getNotificationIcon(type) {
        const icons = {
            success: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm4.2 6.2l-5 5c-.2.2-.4.3-.7.3s-.5-.1-.7-.3l-2.5-2.5c-.4-.4-.4-1 0-1.4s1-.4 1.4 0L8.5 11l4.3-4.3c.4-.4 1-.4 1.4 0s.4 1 0 1.4z"/>
                </svg>
            `,
            info: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 13H9v-6h2v6zm0-8H9V5h2v2z"/>
                </svg>
            `,
            warning: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2L1 18h18L10 2zm1 14H9v-2h2v2zm0-4H9V8h2v4z"/>
                </svg>
            `,
            error: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3.5 10.1c.4.4.4 1 0 1.4-.2.2-.4.3-.7.3s-.5-.1-.7-.3L10 11.4l-2.1 2.1c-.2.2-.4.3-.7.3s-.5-.1-.7-.3c-.4-.4-.4-1 0-1.4L8.6 10 6.5 7.9c-.4-.4-.4-1 0-1.4s1-.4 1.4 0L10 8.6l2.1-2.1c.4-.4 1-.4 1.4 0s.4 1 0 1.4L11.4 10l2.1 2.1z"/>
                </svg>
            `
        };
        return icons[type] || icons.info;
    }
    
    const notificationList = notifications
        .sort((a, b) => b.timestamp - a.timestamp) // Newest first
        .map(renderNotification)
        .join('');
        
    return {
        html: `
            <div class="notifications-container">
                ${notificationList}
            </div>
        `,
        on: {
            '[data-action="close-notification"]:click': (e) => {
                const notificationId = e.target.closest('[data-notification-id]').dataset.notificationId;
                const currentNotifications = context.notifications$.value;
                const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);
                context.notifications$.next(updatedNotifications);
                return of(null);
            }
        }
    };
}