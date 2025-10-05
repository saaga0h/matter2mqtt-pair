import { of } from 'rxjs';
import { startCamera, stopCamera, scanQRCode } from '../../tranforms/camera.transforms.js';

export const qrScannerComponent = (cameraState, context) => {
  const { active, scanning, stream } = cameraState;

  return {
    html: `
      <div class="section">
        <h2>1. Scan QR Code</h2>
        <video id="video" ${active ? '' : 'style="display: none;"'}></video>
        <div class="camera-controls">
          <button data-action="start-camera" class="primary" ${active ? 'style="display: none;"' : ''}>
            Start Camera
          </button>
          <button data-action="stop-camera" ${!active ? 'style="display: none;"' : ''}>
            Stop Camera
          </button>
        </div>
        <p class="help-text">
          Point your camera at the Matter QR code on your device. The pairing code will be extracted automatically.
        </p>
      </div>
    `,
    on: {
      '[data-action="start-camera"]:click': () => {
        startCamera(context.cameraState$, context.notifications$)
          .then((stream) => {
            const video = document.getElementById('video');
            if (video) {
              video.srcObject = stream;
              video.style.display = 'block';
              video.play();
              
              // Start QR scanning once video is ready
              video.addEventListener('loadedmetadata', () => {
                scanQRCode(video, context.cameraState$, context.formState$, context.notifications$);
              });
            }
          })
          .catch(() => {
            // Error already handled in startCamera transform
          });
        return of(null);
      },
      
      '[data-action="stop-camera"]:click': () => {
        stopCamera(context.cameraState$);
        const video = document.getElementById('video');
        if (video) {
          video.style.display = 'none';
        }
        return of(null);
      }
    }
  };
};