import { navigate } from "../../core/router.js";
import { breadcrumbComponent } from "../breadcrumb/breadcrumb.component.js";
import { of } from "rxjs";

export const headerComponent = (currentRoute) => ({
  html: `
    <header>
      <div class="header-main">
        <h1>matter2mqtt</h1>
        <button class="toggle-button" data-action="toggle-theme" title="Toggle light/dark theme">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
          </svg>
        </button>
      </div>
      ${breadcrumbComponent(currentRoute).html}
    </header>
  `,
  on: {
    '[data-action="toggle-theme"]:click': (e) => {
      e.preventDefault();
      document.body.classList.toggle('light');
      return of(null);
    },
    '[data-route]:click': (e) => {
      e.preventDefault();
      const route = e.target.getAttribute('data-route');
      if (route) {
        navigate(route);
      }
      return of(null);
    }
  }
});