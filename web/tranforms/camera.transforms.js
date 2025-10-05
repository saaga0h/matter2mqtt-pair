import { fromEvent, merge, EMPTY } from 'rxjs';
import { tap, map, catchError, takeUntil, switchMap } from 'rxjs/operators';
import { addNotification } from './notifications.transforms.js';

/**
 * Pure camera transforms for QR scanning
 */

export const startCamera = (cameraState$, notifications$) => {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      cameraState$.next({
        active: true,
        scanning: true,
        stream: stream
      });
      
      addNotification(notifications$, 'info', 'Camera started. Point at QR code...');
      resolve(stream);
    } catch (error) {
      addNotification(notifications$, 'error', `Failed to start camera: ${error.message}`);
      reject(error);
    }
  });
};

export const stopCamera = (cameraState$) => {
  const currentState = cameraState$.value;
  
  if (currentState.stream) {
    currentState.stream.getTracks().forEach(track => track.stop());
  }
  
  cameraState$.next({
    active: false,
    scanning: false,
    stream: null
  });
};

export const scanQRCode = (videoElement, cameraState$, formState$, notifications$) => {
  if (!videoElement || !window.jsQR) {
    addNotification(notifications$, 'error', 'QR scanner not available');
    return EMPTY;
  }

  const scan = () => {
    if (!cameraState$.value.scanning) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvas.height = videoElement.videoHeight;
      canvas.width = videoElement.videoWidth;
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        // Update form state with scanned code
        const currentForm = formState$.value;
        formState$.next({
          ...currentForm,
          code: code.data
        });
        
        addNotification(notifications$, 'success', 'QR code scanned successfully!');
        stopCamera(cameraState$);
        return;
      }
    }
    
    if (cameraState$.value.scanning) {
      requestAnimationFrame(scan);
    }
  };

  // Start scanning
  requestAnimationFrame(scan);
  
  return EMPTY;
};