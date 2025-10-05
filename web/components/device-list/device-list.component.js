import { of } from 'rxjs';
import { select } from "../../core/dom.js";
import { deviceComponent } from "../device/device.component.js";

export const deviceListComponent = (devices, context) => {
  if (!devices || devices.length === 0) {
    return {
      html: `
        <div class="empty-state">
          <h2>No Devices Yet</h2>
          <p>Pair your first Matter device to get started</p>
          <button data-action="pair" class="primary" style="margin-top: 1rem;">
            + Pair New Device
          </button>
        </div>
      `.trim(),
      on: {
        '[data-action="pair"]:click': e => {
          if (context.onPair) {
            context.onPair();
          }
          return of(null);
        }
      }
    };
  }

  return {
    html: `
      <div class="devices-grid">
        ${devices.map(device => `
          <div data-mount="device-${device.node_id}"></div>
        `).join('')}
      </div>
    `.trim(),
    children: devices.map(device => ({
      selector: `[data-mount="device-${device.node_id}"]`,
      component: deviceComponent(device, context)
    }))
  };
};