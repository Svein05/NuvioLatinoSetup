import { MiniNuvioCore } from '../features/collections/index.js';
import { state as defaultState } from './wizard-state.js';

export class MiniNuvio extends MiniNuvioCore {
  constructor(containerId, options = {}) {
    super(containerId, { state: options.state || defaultState, ...options });
  }
}
