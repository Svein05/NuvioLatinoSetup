import { appController, DEMO_POSTERS } from './wizard-controller.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';

export { DEMO_POSTERS, appController };

window.appController = appController;

whenDocumentReady(() => {
  appController.init();
});
