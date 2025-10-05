import { fromEvent, Subject, EMPTY } from "rxjs"
import { filter, switchMap, takeUntil, share } from "rxjs/operators"

// Global event streams
const eventStreams = {
  click: fromEvent(document.body, "click").pipe(share()),
  input: fromEvent(document.body, "input").pipe(share()),
  submit: fromEvent(document.body, "submit").pipe(share()),
  change: fromEvent(document.body, "change").pipe(share()),
  keypress: fromEvent(document.body, "keypress").pipe(share()),
  keydown: fromEvent(document.body, "keydown").pipe(share()),
  focusout: fromEvent(document.body, "focusout").pipe(share())
}

const disposeRegistry = new WeakMap()

export const mount = (container, component) => {
  const { html, on = {}, children = [] } = component

  // Cleanup
  const oldDispose$ = disposeRegistry.get(container)
  if (oldDispose$) {
    oldDispose$.next()
    oldDispose$.complete()
  }

  const dispose$ = new Subject()
  disposeRegistry.set(container, dispose$)

  container.innerHTML = html

  // Wire handlers
  Object.entries(on).forEach(([key, handler]) => {
    const [selector, eventType] = key.split(":")

    // Get stream or create new one if not in our map
    let stream$ = eventStreams[eventType]
    if (!stream$) {
      // Create a new stream for unknown event types
      stream$ = fromEvent(document.body, eventType).pipe(share())
      eventStreams[eventType] = stream$ // Cache it for reuse
    }

    stream$
      .pipe(
        filter(e => {
          const target = e.target
          const element = target.matches(selector)
            ? target
            : target.closest(selector)
          return container.contains(target) && !!element
        }),
        switchMap(e => {
          const result = handler(e)
          if (!result || typeof result.subscribe !== "function") {
            console.error(
              `Handler for "${key}" must return Observable, got:`,
              result
            )
            return EMPTY // Return empty stream instead of throwing
          }
          return result
        }),
        takeUntil(dispose$)
      )
      .subscribe({
        // TODO may not need next & complete
        next: value => console.log("Framework: Subscribe next:", value),
        error: err => console.error(`Error in handler "${key}":`, err),
        complete: () => console.log(`Framework: Subscribe complete: ${key}`)
      })
  })

  // Mount children
  children.forEach(child => {
    const { selector, component: childComp } = child
    const childEl = container.querySelector(selector)
    if (childEl) mount(childEl, childComp)
  })
}
