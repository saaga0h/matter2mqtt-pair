import { select } from "../../core/dom.js";
import { navigate } from "../../core/router.js";
import { of } from "rxjs";

// components/header/header.component.js
export const headerComponent = (currentRoute) => ({
  html: `
    <header>
      <h1>matter2mqtt</h1>
      <nav>
        ${currentRoute === '/' ? '<span>Devices</span>' : '<a href="#" data-action="navigate-home">Devices</a>'}
        ${currentRoute === '/pair' ? '<span>Pair Device</span>' : '<a href="#" data-action="navigate-pair">Pair Device</a>'}
      </nav>
      <button class="toggle-button" data-action="toggle-theme" title="Toggle light/dark theme">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
        </svg>
      </button>
    </header>
  `,
  on: {
    '[data-action="toggle-theme"]:click': (e) => {
      e.preventDefault();
      document.body.classList.toggle('light');
      return of(null);
    },
    '[data-action="navigate-home"]:click': (e) => {
      e.preventDefault();
      navigate('/');
      return of(null);
    },
    '[data-action="navigate-pair"]:click': (e) => {
      e.preventDefault();
      navigate('/pair');
      return of(null);
    }
  }
});