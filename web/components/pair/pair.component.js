import { of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { pairDevice } from '../../tranforms/pair.transforms.js';
import { submitHelper } from '../../core/streams.js';
import { createValidator, required, integer, min } from '../../core/validation.js';
import { addNotification } from '../../tranforms/notifications.transforms.js';
import { escapeHtml } from '../../utils.js';

export const pairComponent = (formState, context) => {
  const { code, name, node_id, isSubmitting } = formState;

  // Create field validators as RxJS operators that collect errors instead of throwing immediately
  const validateCode = () => (source) => source.pipe(
    map(formData => {
      const validator = createValidator(formData.code).pipe(required('Pairing code is required'));
      const result = validator.getResult();
      
      return {
        ...formData,
        _validationErrors: [
          ...(formData._validationErrors || []),
          ...(result.valid ? [] : Object.values(result.errors).filter(Boolean))
        ]
      };
    })
  );

  const validateName = () => (source) => source.pipe(
    map(formData => {
      const validator = createValidator(formData.name).pipe(required('Device name/topic is required'));
      const result = validator.getResult();
      
      return {
        ...formData,
        _validationErrors: [
          ...(formData._validationErrors || []),
          ...(result.valid ? [] : Object.values(result.errors).filter(Boolean))
        ]
      };
    })
  );

  const validateNodeId = () => (source) => source.pipe(
    map(formData => {
      const validator = createValidator(formData.node_id).pipe(
        required('Node ID is required'),
        integer('Node ID must be a valid number'),
        min(1, 'Node ID must be greater than 0')
      );
      const result = validator.getResult();
      
      return {
        ...formData,
        _validationErrors: [
          ...(formData._validationErrors || []),
          ...(result.valid ? [] : Object.values(result.errors).filter(Boolean))
        ]
      };
    })
  );

  // Final validation check that throws if any errors accumulated
  const checkValidation = () => (source) => source.pipe(
    map(formData => {
      const errors = formData._validationErrors || [];
      
      if (errors.length > 0) {
        throw { type: 'validation', errors };
      }
      
      // Remove validation errors from formData before proceeding
      const { _validationErrors, ...cleanFormData } = formData;
      return cleanFormData;
    })
  );

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
              value="${node_id || ''}"
              ${isSubmitting ? 'disabled' : ''}
            >
            <p class="help-text">
              Unique identifier for this device (1, 2, 3, etc.)
            </p>
          </div>

          <button type="submit" class="primary" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? 'Pairing...' : 'Pair Device'}
          </button>
        </form>
      </div>
    `,
    on: {
      '[data-form="pair-form"]:submit': (e) => {
        // Use submitHelper to handle form data extraction and preventDefault
        return submitHelper(e).pipe(
          validateCode(),
          validateName(),
          validateNodeId(),
          checkValidation(), // Throws if any validation errors accumulated
          switchMap(validatedFormData => {
            // All validation passed - proceed with pairing
            return pairDevice(context.formState$, context.notifications$, validatedFormData);
          }),
          
          // Handle validation errors reactively
          catchError(error => {
            if (error.type === 'validation') {
              // Show validation errors through notification system
              error.errors.forEach(errorMsg => {
                addNotification(context.notifications$, 'error', errorMsg);
              });
            } else {
              // Handle other errors
              addNotification(context.notifications$, 'error', 'An unexpected error occurred');
            }
            
            // Return empty observable to complete the stream
            return of(null);
          })
        );
      }
    }
  };
};