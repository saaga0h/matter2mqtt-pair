import { of } from 'rxjs';
import { dialog } from '../../core/dialog.js';
import { unpairDevice } from '../../tranforms/devices.transforms.js';
import { escapeHtml } from '../../utils.js';

export const unpairDialogComponent = (device, context) => ({
  html: `
    <div data-component="dialog-content">
      <header class="dialog-header">
        <h3>Unpair Device</h3>
        <button data-action="close" class="dialog-close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      <div class="dialog-body">
        <p>Are you sure you want to unpair <strong>"${escapeHtml(device.topic)}"</strong>?</p>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 1rem;">
          This will remove the device from devices.yaml and unpair it from the Matter fabric.
          You'll need to restart matter2mqtt for changes to take effect.
        </p>
      </div>
      <footer class="dialog-footer">
        <button data-action="cancel" class="secondary">Cancel</button>
        <button data-action="confirm-unpair" class="danger">Unpair Device</button>
      </footer>
    </div>
  `,
  
  on: {
    '[data-action="close"]:click': () => {
      dialog.close(`unpair-device-${device.node_id}`);
      return of(null);
    },
    
    '[data-action="cancel"]:click': () => {
      dialog.close(`unpair-device-${device.node_id}`);
      return of(null);
    },
    
    '[data-action="confirm-unpair"]:click': () => {
      dialog.close(`unpair-device-${device.node_id}`);
      
      // Show loading state if needed
      console.log('Unpairing device:', device);
      
      // Call the unpair transform which handles API call and devices$ update
      return unpairDevice(context.devices$, context.notifications$, device);
    }
  }
});