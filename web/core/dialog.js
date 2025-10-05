import { filter } from "rxjs/operators"
import { fromClick, fromKeydown } from "./streams.js"
import { select } from "./dom.js"
import { mount } from "./framework.js"

// Dialog infrastructure - handles modal behavior, positioning, accessibility
// This is a global utility that provides "how" dialogs work, not "what" they contain

// Create dialog shell that wraps any content
export const dialogShell = content => `
  <dialog data-component="dialog" class="dialog">
    <form method="dialog" class="dialog-form">
      ${content}
    </form>
  </dialog>
`

// Global dialog manager - handles infrastructure concerns
class DialogManager {
  container = null
  initialized = false

  // Ensure dialog container exists
  ensureContainer() {
    if (!this.container) {
      const containerId = "dialog-container"
      if (!document.getElementById(containerId)) {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div id="${containerId}"></div>`
        )
      }
      this.container = select(`#${containerId}`)
    }
    return this.container
  }

  // Initialize global dialog event handling (call once)
  init() {
    if (this.initialized) return

    // Handle dialog infrastructure interactions
    const dialogClicks$ = fromClick("body").pipe(
      filter(e => {
        const target = e.target
        return target.closest('[data-component="dialog"]') !== null
      })
    )

    dialogClicks$.subscribe(e => {
      const target = e.target
      const action = target.dataset.action
      const dialog = target.closest('[data-component="dialog"]')

      if (!dialog) return

      // Handle close/cancel actions
      if (action === "close" || action === "cancel") {
        this.close(dialog.dataset.dialogId)
      }

      // Handle backdrop clicks (clicking outside dialog content)
      if (target === dialog) {
        this.close(dialog.dataset.dialogId)
      }
    })

    // Handle ESC key for accessibility
    const escapeKeyPressed$ = fromKeydown("body").pipe(
      filter(e => e.key === "Escape" && !!select('[data-component="dialog"]'))
    )

    escapeKeyPressed$.subscribe(() => {
      // Close the topmost dialog
      const openDialog = select('[data-component="dialog"]')
      if (openDialog) {
        this.close(openDialog.dataset.dialogId)
      }
    })

    this.initialized = true
  }

  // Show a dialog with given content
  show(dialogId, component) {
    // Remove any existing dialog with same ID
    const existing = document.querySelector(`[data-dialog-id="${dialogId}"]`)
    if (existing) existing.remove()

    // Ensure container exists
    const container = this.ensureContainer()

    // Create dialog shell with mount point
    const dialogHtml = `
      <dialog data-component="dialog" data-dialog-id="${dialogId}" class="dialog">
        <form method="dialog" class="dialog-form">
          <div data-dialog-mount="${dialogId}"></div>
        </form>
      </dialog>
    `

    container.insertAdjacentHTML("beforeend", dialogHtml)

    // Get the dialog element
    const dialog = container.lastElementChild

    // Mount the component to the mount point
    mount(dialog.querySelector(`[data-dialog-mount="${dialogId}"]`), component)

    // Show the dialog
    dialog.showModal()

    // Focus management
    const firstFocusable = dialog.querySelector(
      "input, textarea, select, button"
    )
    if (firstFocusable) {
      firstFocusable.focus()
    }

    // Emit lifecycle event
    document.dispatchEvent(
      new CustomEvent("dialog-opened", {
        detail: { dialogId, dialog }
      })
    )

    return dialog
  }

  // Close a dialog and clean up
  close(dialogId) {
    const dialog = document.querySelector(`[data-dialog-id="${dialogId}"]`)
    if (dialog) {
      // Emit close event before removal
      document.dispatchEvent(
        new CustomEvent("dialog-closed", {
          detail: { dialogId, dialog }
        })
      )

      dialog.close()
      dialog.remove()
    }
  }

  // Get dialog by ID
  getDialog(dialogId) {
    return document.querySelector(`[data-dialog-id="${dialogId}"]`)
  }

  // Check if dialog is open
  isOpen(dialogId) {
    const dialog = this.getDialog(dialogId)
    return dialog ? dialog.open : false
  }
}

// Global dialog instance - infrastructure utility
export const dialog = new DialogManager()
