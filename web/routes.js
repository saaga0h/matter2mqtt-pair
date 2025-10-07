// Route definitions with metadata - pure data structure
import { homePageComponent } from './components/pages/home-page.component.js';
import { pairPageComponent } from './components/pages/pair-page.component.js';

export const routes = {
  '/': {
    component: homePageComponent,
    breadcrumb: {
      label: 'Devices',
      parent: null
    }
  },
  '/pair': {
    component: pairPageComponent,
    breadcrumb: {
      label: 'Pair device',
      parent: '/'
    }
  },
  '/device/:id': {
    component: null, // TODO
    breadcrumb: {
      label: 'Device info',
      parent: '/'
    }
  },
  '/device/:id/edit': {
    component: null, // TODO
    breadcrumb: {
      label: 'Edit device',
      parent: '/device/:id'
    }
  }
};

export const getRouteComponent = (route) => {
  const routeConfig = routes[route];
  return routeConfig ? routeConfig.component : routes['/'].component;
};

const buildBreadcrumbChain = (route, currentRoute) => {
  if (!route || !routes[route]) {
    return [];
  }
  
  const routeConfig = routes[route];
  const breadcrumb = {
    path: route,
    label: routeConfig.breadcrumb.label,
    active: route === currentRoute
  };
  
  const parentChain = buildBreadcrumbChain(routeConfig.breadcrumb.parent, currentRoute);
  return [...parentChain, breadcrumb];
};

export const getRouteBreadcrumbs = (currentRoute) => 
  buildBreadcrumbChain(currentRoute, currentRoute);