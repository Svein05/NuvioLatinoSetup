import { appController, DEMO_POSTERS } from '../src/app/wizard-controller.js';
import { whenDocumentReady } from '../src/shared/ui/when-document-ready.js';

export { DEMO_POSTERS, appController };

window.appController = appController;

whenDocumentReady(() => {
  appController.init();
});
