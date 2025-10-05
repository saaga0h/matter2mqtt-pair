import { of } from 'rxjs';
import { dialog } from '../../core/dialog.js';
import { unpairDialogComponent } from '../dialog/unpair-dialog.component.js';
import { escapeHtml } from '../../utils.js';

export const deviceComponent = (device, context) => {
  return {
    html: `
      <div class="device-card">
          <div class="device-header">
              <div class="device-topic">${escapeHtml(device.topic)}</div>
              <div class="device-node">Node ${device.node_id}</div>
          </div>
          <div class="device-details">
              ${device.sensitivity ? `
                  <div class="device-detail">
                      <span class="detail-label">Sensitivity</span>
                      <span class="detail-value">${escapeHtml(device.sensitivity)}</span>
                  </div>
              ` : ''}
              ${device.debounce_ms ? `
                  <div class="device-detail">
                      <span class="detail-label">Debounce</span>
                      <span class="detail-value">${device.debounce_ms}ms</span>
                  </div>
              ` : ''}
          </div>
          <div class="device-actions">
              <button data-action="edit">Edit</button>
              <button data-action="unpair" class="danger">Unpair</button>
          </div>
      </div>    
    `.trim(),
    on: {
      '[data-action="edit"]:click': e => {
        console.log('Edit device:', device);
        return of(null);
      },
      '[data-action="unpair"]:click': e => {
        const component = unpairDialogComponent(device, context);
        dialog.show(`unpair-device-${device.node_id}`, component);
        return of(null);
      }
    }
  };
};