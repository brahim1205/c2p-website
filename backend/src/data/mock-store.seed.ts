import type { Store } from './mock-store.js';
import { adminSeed } from './mock-store-seed/admin.js';
import { communicationsSeed } from './mock-store-seed/communications.js';
import { financeSeed } from './mock-store-seed/finance.js';
import { learningAssessmentsSeed } from './mock-store-seed/learning-assessments.js';
import { learningCatalogSeed } from './mock-store-seed/learning-catalog.js';
import { marketplaceSeed } from './mock-store-seed/marketplace.js';
import { projectsSeed } from './mock-store-seed/projects.js';

export const initialStoreSeed: Store = {
  ...marketplaceSeed,
  ...learningCatalogSeed,
  ...learningAssessmentsSeed,
  ...projectsSeed,
  ...financeSeed,
  ...communicationsSeed,
  ...adminSeed,
};
