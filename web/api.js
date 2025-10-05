import { from, of, throwError } from "rxjs"
import { catchError, mergeMap, tap } from "rxjs/operators"

const checkResponse = () =>
  tap(response => {
    if (!response.ok) {
      throw response
    }
  })

const parseJson = () => mergeMap(response => from(response.json()))

const parseVoid = () => mergeMap(response => of(undefined))

/**
 * Error handling operator for streams
 * - With fallback: returns fallback value, keeps stream alive
 * - Without fallback: re-throws error, kills stream
 */
function handleErrors(operation, fallback) {
  return catchError(error => {
    let errorMessage;
    
    if (error instanceof Response) {
      errorMessage = `HTTP ${error.status} ${error.statusText}`;
      console.warn(`${operation} failed: ${errorMessage}`);
    } else if (error.message) {
      errorMessage = error.message;
      console.warn(`${operation} failed: ${errorMessage}`);
    } else {
      errorMessage = 'Unknown error';
      console.warn(`${operation} failed:`, error);
    }

    // Create a proper Error object with the message for consistent error handling
    const apiError = new Error(errorMessage);
    apiError.originalError = error;
    
    return fallback !== undefined ? of(fallback) : throwError(() => apiError);
  })
}

export const devices = () =>
  from(fetch(`/api/devices`)).pipe(
    checkResponse(),
    parseJson(),
    handleErrors(`devices()`)
  )

export const pair = (deviceData) =>
  from(
    fetch(`/api/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceData)
    })
  ).pipe(
    mergeMap(response => {
      if (!response.ok) {
        // Throw a descriptive error that will propagate up
        return throwError(() => new Error(`HTTP ${response.status} ${response.statusText}`));
      }
      // Parse JSON, any JSON parsing errors will also propagate up
      return from(response.json());
    })
  )

export const unpair = (name, list) =>
  from(
    fetch(`/api/unpair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list)
    })
  ).pipe(
    checkResponse(), 
    parseJson(), 
    handleErrors(`unpair(${name})`)
  )
