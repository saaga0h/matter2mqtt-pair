// Icon SVG content map for inline use
const iconSvgMap = {
  plus:
    '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  trash:
    '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
  x:
    '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  edit:
    '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>'
}

export const buttonComponent = config => {
  const variant = config.variant || "secondary"
  const type = config.type || "button"
  const classes = [
    "btn",
    `btn--${variant}`,
    config.disabled ? "btn--disabled" : "",
    config.icon && !config.label ? "btn--icon-only" : "",
    config.class ? config.class : null
  ]
    .filter(Boolean)
    .join(" ")

  const attrs = Object.entries(config.attrs || {})
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ")

  return {
    html: `
      <button type="${type}" class="${classes}" ${
      config.disabled ? "disabled" : ""
    } ${attrs}>
        ${
          config.icon
            ? `<svg class="btn--icon ${config.iconClass ||
                ""}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvgMap[
                config.icon
              ] || ""}</svg>`
            : ""
        }
        ${
          config.label
            ? `<span class="btn--label ${config.labelClass || ""}">${
                config.label
              }</span>`
            : ""
        }
      </button>
    `
  }
}
