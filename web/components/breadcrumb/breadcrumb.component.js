import { getRouteBreadcrumbs } from '../../routes.js';

// Breadcrumb component that reads from routes.js as single source of truth
export const breadcrumbComponent = (currentRoute) => {
  const breadcrumbs = getRouteBreadcrumbs(currentRoute);
  
  return {
    html: `
      <nav class="breadcrumb">
        ${breadcrumbs.map((crumb, index) => {
          if (crumb.active) {
            return `<span class="breadcrumb-current">${crumb.label}</span>`;
          } else {
            return `<a href="#" class="breadcrumb-link" data-route="${crumb.path}">${crumb.label}</a>`;
          }
        }).join('<span class="breadcrumb-separator">›</span>')}
      </nav>
    `
  };
};