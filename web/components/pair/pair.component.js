import { of } from 'rxjs';
import { pairDevice, validatePairForm } from '../../tranforms/pair.transforms.js';
import { addNotification } from '../../tranforms/notifications.transforms.js';
import { escapeHtml } from '../../utils.js';

export const pairComponent = (formState, context) => {
  const { code, name, node_id, isSubmitting } = formState;

  return {
    html: `
      <div class="section">
        <h2>2. Enter Pairing Details</h2>
        <form data-form="pair-form">
          <div class="form-group">
            <label for="code">Pairing Code *</label>
            <input 
              type="text" 
              id="code" 
              name="code" 
              placeholder="MT:Y.K9042C00KA0648G00" 
              value="${escapeHtml(code || '')}"
              required
              ${isSubmitting ? 'disabled' : ''}
            >
            <p class="help-text">
              Format: MT:Y.K9042C00KA0648G00 (from QR code or device label)
            </p>
          </div>

          <div class="form-group">
            <label for="name">Device Name/Topic *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="motion/living-room" 
              value="${escapeHtml(name || '')}"
              required
              ${isSubmitting ? 'disabled' : ''}
            >
            <p class="help-text">
              This will be the MQTT topic prefix for the device
            </p>
          </div>

          <div class="form-group">
            <label for="node_id">Node ID *</label>
            <input 
              type="number" 
              id="node_id" 
              name="node_id" 
              placeholder="1" 
              min="1" 
              value="${node_id || ''}"
              required
              ${isSubmitting ? 'disabled' : ''}
            >
            <p class="help-text">
              Unique identifier for this device (1, 2, 3, etc.)
            </p>
          </div>

          <button type="submit" class="primary" data-action="submit-form" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? 'Pairing...' : 'Pair Device'}
          </button>
        </form>
      </div>
    `,
    on: {
      '[data-form="pair-form"]:submit': (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const deviceData = {
          code: formData.get('code').trim(),
          name: formData.get('name').trim(),
          node_id: parseInt(formData.get('node_id')) || null
        };
        
        const validation = validatePairForm(deviceData);
        
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            addNotification(context.notifications$, 'error', error);
          });
          return;
        }
        
        // Subscribe to the observable to make it execute
        pairDevice(context.formState$, context.notifications$, deviceData).subscribe({
          next: (result) => {
            console.log('Pair result:', result);
          },
          error: (error) => {
            console.error('Pair subscription error:', error);
          }
        });
      }
    }
  };
};