import { tap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import * as api from '../api.js';
import { addNotification } from './notifications.transforms.js';

const updateDevicesState = (devices$) =>
  tap((response) => {
    // Extract devices array from API response {status: "success", devices: [...]}
    const devices = response.devices || [];
    devices$.next(devices);
  });

const extractData = () =>
  map((response) => response.devices || []);

const handleError = (operation, notifications$, showError = true) =>
  catchError((error) => {
    console.error(`${operation} failed:`, error);
    if (showError && notifications$) {
      addNotification(notifications$, 'error', `${operation} failed: ${error.message || 'Unknown error'}`);
    }
    // Return empty observable to prevent stream from breaking
    return of({ status: 'error', message: error.message || 'Unknown error', devices: [] });
  });

export const unpairDevice = (devices$, notifications$, device) => {
  return api.unpair(device.node_id, { node_id: device.node_id }).pipe(
    tap((response) => {
      if (response.status === 'success') {
        // Remove device from current devices list
        const currentDevices = devices$.value;
        const updatedDevices = currentDevices.filter(d => d.node_id !== device.node_id);
        devices$.next(updatedDevices);
        
        // Show success notification
        addNotification(notifications$, 'success', `Device "${device.topic}" unpaired successfully. Restart matter2mqtt to apply changes.`);
      } else {
        // Show error notification for API response errors
        addNotification(notifications$, 'error', `Failed to unpair device: ${response.message || 'Unknown error'}`);
      }
    }),
    handleError('Unpairing device', notifications$, true), // Show error for network/API failures
    map((response) => response)
  );
};

export const loadDevices = (devices$, notifications$) =>
  api.devices().pipe(
    handleError('Loading devices', notifications$),
    updateDevicesState(devices$),
    extractData()
  );

export const pairDevice = (devices$, notifications$, device) => {};