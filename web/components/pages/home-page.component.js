import { deviceListComponent } from '../device-list/device-list.component.js';
import { actionsComponent } from '../actions/actions.component.js';

export const homePageComponent = (state, context) => {
  return {
    html: `
      <div class="container">
        <div id="status-message" class="status-message"></div>

        <div id="actions-container"></div>

        <div id="devices-container" class="loading">
          Loading devices...
        </div>
      </div>
    `,
    children: [
      {
        selector: '#actions-container',
        component: actionsComponent(context)
      },
      {
        selector: '#devices-container', 
        component: deviceListComponent(state.devices, {
          devices$: context.devices$,
          notifications$: context.notifications$,
          onPair: () => context.navigate('/pair'),
          onUnpair: (device) => console.log('Unpair device:', device)
        })
      }
    ]
  };
};