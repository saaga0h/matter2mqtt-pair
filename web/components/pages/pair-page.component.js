import { pairComponent } from '../pair/pair.component.js';
import { qrScannerComponent } from '../qr-scanner/qr-scanner.component.js';
import { navigate } from '../../core/router.js';
import { of } from 'rxjs';

export const pairPageComponent = (state, context) => {
  return {
    html: `
      <div class="container">
        <div id="status-message" class="status-message"></div>

        <!-- QR Code Scanner Section -->
        <div id="qr-scanner-container"></div>

        <!-- Manual Entry Section -->
        <div id="pair-form-container"></div>
      </div>
    `,
    children: [
      {
        selector: '#qr-scanner-container',
        component: qrScannerComponent(state.cameraState, {
          cameraState$: context.cameraState$,
          formState$: context.formState$,
          notifications$: context.notifications$
        })
      },
      {
        selector: '#pair-form-container',
        component: pairComponent(state.formState, {
          formState$: context.formState$,
          devices$: context.devices$,
          notifications$: context.notifications$
        })
      }
    ]
  };
};