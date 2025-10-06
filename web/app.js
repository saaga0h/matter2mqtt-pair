import {
  BehaviorSubject,
  combineLatest,
} from "rxjs"
import { mount } from "./core/framework.js"
import { select } from "./core/dom.js"
import { loadDevices } from "./tranforms/devices.transforms.js"
import { notificationComponent } from "./components/notification/notification.component.js"
import { headerComponent } from "./components/header/header.component.js"
import { route$, navigate } from "./core/router.js"
import { getRouteComponent } from "./routes.js"

// Global state streams at the edges
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
  // Mount header when route changes
  combineLatest([route$]).subscribe(([currentRoute]) => {
    mount(
      select("#header-container"),
      headerComponent(currentRoute)
    )
  })
  
  // Mount notifications when they actually change
  combineLatest([notifications$]).subscribe(([notifications]) => {
    mount(
      select("#notifications-container") || document.body,
      notificationComponent(notifications, { notifications$ })
    )
  })
  
  // Mount page components based on current route
  combineLatest([route$, devices$, formState$, cameraState$]).subscribe(([currentRoute, devices, formState, cameraState]) => {
    const RouteComponent = getRouteComponent(currentRoute);
    
    // Prepare state for the route component
    const pageState = {
      devices,
      formState,
      cameraState,
      currentRoute
    };
    
    // Prepare context for child components
    const context = {
      devices$,
      notifications$,
      formState$,
      cameraState$,
      navigate
    };
    
    // Mount the page component
    const pageElement = RouteComponent(pageState, context);
    mount(select("#app") || document.body, pageElement);
  })
}

/**
  Global functions for inline handlers
*/
window.toggleMode = function() {
  document.body.classList.toggle('light');
}

/**
  App bootstrap
*/
document.addEventListener("DOMContentLoaded", () => {
  initializeDataFlow()
  initializeUI()
})