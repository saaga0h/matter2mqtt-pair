import { of } from 'rxjs';
import { loadDevices } from '../../tranforms/devices.transforms.js';
import { addNotification } from '../../tranforms/notifications.transforms.js';
import { navigate } from '../../core/router.js';

export const actionsComponent = (context) => {
  return {
    html: `
      <div class="actions">
          <button class="primary" data-action="navigate-pair">
              + Pair New Device
          </button>
          <button data-action="refresh">
              ↻ Refresh
          </button>
      </div>
    `,
    on: {
      '[data-action="navigate-pair"]:click': (e) => {
        e.preventDefault();
        navigate('/pair');
        return of(null);
      },
      '[data-action="refresh"]:click': () => {
        // Add info notification using centralized transform
        addNotification(context.notifications$, 'info', 'Refreshing devices...');
        
        // Trigger refresh
        loadDevices(context.devices$, context.notifications$).subscribe();
        return of(null);
      }
    }
  };
};