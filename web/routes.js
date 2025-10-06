// Route definitions and page components
import { homePageComponent } from './components/pages/home-page.component.js';
import { pairPageComponent } from './components/pages/pair-page.component.js';

export const routes = {
  '/': homePageComponent,
  '/pair': pairPageComponent,
  // Add more routes as needed
};

export function getRouteComponent(route) {
  return routes[route] || routes['/'];
}