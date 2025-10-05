import {
  BehaviorSubject,
  combineLatest,
} from "rxjs"
import { mount } from "./core/framework.js"
import { select } from "./core/dom.js"
import { loadDevices } from "./tranforms/devices.transforms.js"
import { notificationComponent } from "./components/notification/notification.component.js"
import { pairComponent } from "./components/pair/pair.component.js"
import { qrScannerComponent } from "./components/qr-scanner/qr-scanner.component.js"

// Streams at the edges
const devices$ = new BehaviorSubject([])
const notifications$ = new BehaviorSubject([])
const cameraState$ = new BehaviorSubject({ active: false, scanning: false, stream: null })
const formState$ = new BehaviorSubject({ 
  code: '', 
  name: '', 
  node_id: null,
  isSubmitting: false 
})

/**
  Data orchestration
*/
const initializeDataFlow = () => {
  // Load devices to suggest next node ID
  loadDevices(devices$, notifications$).subscribe()
  
  // Auto-suggest next node ID when devices load
  combineLatest([devices$]).subscribe(([devices]) => {
    const maxNodeId = devices.reduce((max, device) => Math.max(max, device.node_id || 0), 0)
    const currentForm = formState$.value
    if (!currentForm.node_id) {
      formState$.next({
        ...currentForm,
        node_id: maxNodeId + 1
      })
    }
  })
}

/**
  UI orchestration  
*/
const initializeUI = () => {
  // Mount notifications when they actually change
  combineLatest([notifications$]).subscribe(([notifications]) => {
    mount(
      select("#notifications-container") || document.body,
      notificationComponent(notifications, { notifications$ })
    )
  })
  
  // Mount QR scanner only when camera state changes visually
  combineLatest([cameraState$]).subscribe(([cameraState]) => {
    mount(
      select("#qr-scanner-container"),
      qrScannerComponent(cameraState, { 
        cameraState$, 
        formState$, 
        notifications$ 
      })
    )
  })
  
  // Mount form only when submit state or node_id suggestion changes
  combineLatest([formState$]).subscribe(([formState]) => {
    // Only re-render when visual state changes (submitting state, node_id auto-fill)
    mount(
      select("#pair-form-container"),
      pairComponent(formState, {
        formState$,
        devices$,
        notifications$
      })
    )
  })
}

/**
  App bootstrap
*/
document.addEventListener("DOMContentLoaded", () => {
  initializeDataFlow()
  initializeUI()
})