import { createBadgeCompiler } from '../features/badges/index.js';
import { loadBadgePack } from '../integrations/badges/load-pack.js';

export const compileUniversalBadgeRules = createBadgeCompiler(loadBadgePack);
