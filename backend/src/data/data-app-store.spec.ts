import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appendAppRows, discardAppRows, store, withId, withoutClientId } from './data-app-store.js';

describe('withoutClientId', () => {
  it('drops a client-supplied id so that the server always generates a fresh one', () => {
    const input = { id: '8002', title: 'copie', grade: 20 };
    const stripped = withoutClientId(input);
    assert.deepEqual(stripped, { title: 'copie', grade: 20 });
    assert.equal(input.id, '8002', 'does not mutate the payload');
    const created = withId(stripped);
    assert.notEqual(created.id, '8002');
    assert.match(String(created.id), /^\d+-[0-9a-f-]{36}$/);
  });
});

describe('discardAppRows', () => {
  it('removes only the given rows from the in-memory store', () => {
    const table = 'spec_discard_rows';
    store[table] = [{ id: 'keep' }];
    appendAppRows(table, [{ id: 'ghost-1' }, { id: 'ghost-2' }]);
    discardAppRows({ [table]: [{ id: 'ghost-1' }, { id: 'ghost-2' }] });
    assert.deepEqual(store[table].map((row) => row.id), ['keep']);
    delete store[table];
  });
});
