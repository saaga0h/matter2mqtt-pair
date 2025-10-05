export const select = selector => {
  const element = document.querySelector(selector)
  if (!element) {
    throw new Error(`Element not found for selector: ${selector}`)
  }

  return element
}

export const selectAll = selector => {
  const elements = document.querySelectorAll(selector)
  if (!elements.length) {
    throw new Error(`No elements found for selector: ${selector}`)
  }

  return Array.from(elements)
}

export const selectById = id => {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Element not found for id: ${id}`)
  }

  return element
}
