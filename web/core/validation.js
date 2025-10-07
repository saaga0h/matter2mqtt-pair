import { BehaviorSubject, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

/**
 * Pure functional validation system following reactive declarative patterns
 * No classes, no instances - just pure functions and composable operators
 */

// Validation result structure - pure data
const createValidationResult = (value, valid = true, errors = null) => ({
  value,
  valid,
  errors: errors ? (typeof errors === 'string' ? { general: errors } : errors) : null
});

/**
 * Pure functional validator factory - returns validation stream functions
 */
export const createValidator = (initialValue = '') => {
  const valueSubject = new BehaviorSubject(initialValue);
  
  // Return pure functions that operate on the stream
  return {
    setValue: (value) => valueSubject.next(value),
    getValue: () => valueSubject.value,
    stream$: valueSubject.asObservable().pipe(
      map(value => createValidationResult(value)),
      shareReplay(1)
    ),
    // Pipe function for composing validators
    pipe: (...operators) => {
      const stream$ = valueSubject.asObservable().pipe(
        map(value => createValidationResult(value)),
        ...operators,
        shareReplay(1)
      );
      return {
        setValue: (value) => valueSubject.next(value),
        getValue: () => valueSubject.value,
        stream$,
        getResult: () => {
          let result = null;
          stream$.subscribe(r => result = r).unsubscribe();
          return result;
        }
      };
    },
    getResult: () => {
      let result = null;
      valueSubject.asObservable().pipe(
        map(value => createValidationResult(value))
      ).subscribe(r => result = r).unsubscribe();
      return result;
    }
  };
};

/**
 * Pure validation operator functions - composable RxJS operators
 */

export const required = (message = 'This field is required') => (source) =>
  source.pipe(
    map(result => {
      const value = result.value;
      const isValid = !!(value && String(value).trim());
      
      return {
        ...result,
        valid: result.valid && isValid,
        errors: {
          ...result.errors,
          ...(isValid ? {} : { required: message })
        }
      };
    })
  );

export const minLength = (min, message) => {
  const defaultMessage = `Must be at least ${min} characters`;
  return (source) => source.pipe(
    map(result => {
      const value = String(result.value || '');
      const isValid = !value || value.length >= min;
      
      return {
        ...result,
        valid: result.valid && isValid,
        errors: {
          ...result.errors,
          ...(isValid ? {} : { minLength: message || defaultMessage })
        }
      };
    })
  );
};

export const integer = (message = 'Must be a valid number') => (source) =>
  source.pipe(
    map(result => {
      const value = result.value;
      const isValid = !value || Number.isInteger(Number(value));
      
      return {
        ...result,
        valid: result.valid && isValid,
        errors: {
          ...result.errors,
          ...(isValid ? {} : { integer: message })
        }
      };
    })
  );

export const min = (minValue, message) => {
  const defaultMessage = `Must be at least ${minValue}`;
  return (source) => source.pipe(
    map(result => {
      const value = Number(result.value);
      const isValid = !result.value || value >= minValue;
      
      return {
        ...result,
        valid: result.valid && isValid,
        errors: {
          ...result.errors,
          ...(isValid ? {} : { min: message || defaultMessage })
        }
      };
    })
  );
};

export const custom = (predicate, message = 'Invalid value') => (source) =>
  source.pipe(
    map(result => {
      const value = result.value;
      const isValid = !value || predicate(value);
      
      return {
        ...result,
        valid: result.valid && isValid,
        errors: {
          ...result.errors,
          ...(isValid ? {} : { custom: message })
        }
      };
    })
  );

/**
 * Pure function to combine multiple validators declaratively
 */
export const validateFields = (fieldValidators) => {
  const results = {};
  let allValid = true;
  const allErrors = [];

  Object.entries(fieldValidators).forEach(([fieldName, validator]) => {
    const result = validator.getResult();
    results[fieldName] = result;
    
    if (!result.valid) {
      allValid = false;
      if (result.errors) {
        Object.values(result.errors).forEach(error => {
          if (error) allErrors.push(error);
        });
      }
    }
  });

  return {
    valid: allValid,
    errors: allErrors,
    fields: results
  };
};

/**
 * Debug operator for development - pure function
 */
export const debug = (label = 'Validator') => (source) =>
  source.pipe(
    map(result => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [${label}]`, {
          value: result.value,
          valid: result.valid,
          errors: result.errors
        });
      }
      return result;
    })
  );