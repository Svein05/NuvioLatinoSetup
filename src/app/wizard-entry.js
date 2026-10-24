import './poster-background.js';
import { appController, DEMO_POSTERS } from './wizard-controller.js';
import { whenDocumentReady } from '../shared/ui/when-document-ready.js';

export { DEMO_POSTERS, appController };

whenDocumentReady(() => {
  appController.init();
});
