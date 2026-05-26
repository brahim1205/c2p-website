import { initialStoreSeed } from './mock-store.seed.js';

export type Row = Record<string, unknown>;
export type Store = Record<string, Row[]>;

export function createInitialStore(): Store {
  return JSON.parse(JSON.stringify(initialStoreSeed)) as Store;
}
