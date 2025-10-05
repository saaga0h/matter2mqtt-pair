import {
  BehaviorSubject,
  combineLatest,
} from "rxjs"
import { mount } from "./core/framework.js"
import { select } from "./core/dom.js"
import { dialog } from "./core/dialog.js"
import { loadDevices } from "./tranforms/devices.transforms.js"
import { deviceListComponent } from "./components/device-list/device-list.component.js"
import { notificationComponent } from "./components/notification/notification.component.js"
import { actionsComponent } from "./components/actions/actions.component.js"

// Streams at the edges
const devices$ = new BehaviorSubject([])
const notifications$ = new BehaviorSubject([])

/**
  Data orchestration
*/
const initializeDataFlow = () => {
  // Load devices on startup
  loadDevices(devices$, notifications$).subscribe()
}

/**
  UI orchestration
*/
const initializeUI = () => {
  // Mount actions component
  mount(
    select("#actions-container"),
    actionsComponent({ devices$, notifications$ })
  )
  
  // Mount notifications when they change
  combineLatest([notifications$]).subscribe(([notifications]) => {
    mount(
      select("#notifications-container") || document.body,
      notificationComponent(notifications, { notifications$ })
    )
  })
  
  // Mount device list when devices change
  combineLatest([devices$]).subscribe(([devices]) => {
    mount(
      select("#devices-container"),
      deviceListComponent(devices, {
        devices$,
        notifications$,
        onPair: () => window.location.href = 'pair.html',
        onUnpair: (device) => console.log('Unpair device:', device)
      })
    )
  })
}

/**
  App bootstrap
*/
document.addEventListener("DOMContentLoaded", () => {
  dialog.init()
  initializeDataFlow()
  initializeUI()
})
