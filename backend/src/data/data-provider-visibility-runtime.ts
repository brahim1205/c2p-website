import {
  appendAppRows,
  collectRowsByIds,
  findRow,
  mergeRowsToPersist,
  patchAppRows,
  store,
} from './data-app-store.js';

export function createProviderVisibilityContext() {
  return {
    store,
    findRow,
    appendAppRows,
    patchAppRows,
    mergeRowsToPersist,
    collectRowsByIds,
  };
}
