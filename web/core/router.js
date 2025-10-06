import { BehaviorSubject } from 'rxjs';

// --- ROUTE STREAM (HTML5 History API) ---
export const route$ = new BehaviorSubject(getCurrentRoute());

function getCurrentRoute() {
  // Use pathname for clean URLs (e.g. /pair)
  return window.location.pathname || '/';
}

// Listen for browser navigation (back/forward)
window.addEventListener('popstate', () => {
  route$.next(getCurrentRoute());
});

// Programmatic navigation
export function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    route$.next(path);
  }
}

// Note: For this to work as an SPA, your server must serve index.html for all non-static routes.
