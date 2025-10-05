import { tap, map, catchError, finalize } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import * as api from '../api.js';
import { addNotification } from './notifications.transforms.js';

/**
 * Pure pair transforms for device pairing
 */

export const pairDevice = (formState$, notifications$, deviceData) => {
  // Update form to submitting state
  const currentForm = formState$.value;
  formState$.next({
    ...currentForm,
    isSubmitting: true
  });

  addNotification(notifications$, 'info', 'Commissioning device with chip-tool...');

  return api.pair(deviceData).pipe(
    tap((response) => {
      if (response.status === 'success') {
        addNotification(notifications$, 'success', response.message || 'Device paired successfully!');
        
        // Redirect to main page after success
        timer(2000).subscribe(() => {
          window.location.href = 'index.html';
        });
      } else {
        addNotification(notifications$, 'error', response.message || 'Failed to pair device');
      }
    }),
    catchError((error) => {
      console.error('Pairing device failed:', error);
      
      let errorMessage = 'Unknown error';
      
      // Handle different error types
      if (error instanceof Response) {
        errorMessage = `HTTP ${error.status} ${error.statusText}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error notification
      if (notifications$) {
        addNotification(notifications$, 'error', `Pairing failed: ${errorMessage}`);
      }
      
      // Return observable to keep stream alive
      return of({ status: 'error', message: errorMessage });
    }),
    // Always reset form state in finalize, regardless of success or error
    finalize(() => {
      const currentForm = formState$.value;
      formState$.next({
        ...currentForm,
        isSubmitting: false
      });
    }),
    map((response) => response)
  );
};

export const validatePairForm = (formData) => {
  const errors = [];
  
  if (!formData.code || !formData.code.trim()) {
    errors.push('Pairing code is required');
  }
  
  if (!formData.name || !formData.name.trim()) {
    errors.push('Device name/topic is required');
  }
  
  if (!formData.node_id || formData.node_id < 1) {
    errors.push('Valid node ID is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};