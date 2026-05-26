#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const backendRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const policyPath = path.join(backendRoot, 'dist', 'data', 'data-legacy-api-policy.js');

if (!fs.existsSync(policyPath)) {
  console.error('legacy-data-mode-check: backend/dist missing. Run npm run build first.');
  process.exit(1);
}

const { assertLegacyDataApiAllowed, getLegacyDataApiMode } = await import(policyPath);

function config(mode) {
  return {
    get(key) {
      assert.equal(key, 'DATA_LEGACY_API_MODE');
      return mode;
    },
  };
}

function assertAllowed(mode, operation) {
  assert.doesNotThrow(() => assertLegacyDataApiAllowed(config(mode), operation, 'courses'));
}

function assertBlocked(mode, operation) {
  assert.throws(
    () => assertLegacyDataApiAllowed(config(mode), operation, 'courses'),
    (error) => error?.constructor?.name === 'ForbiddenException',
    `${mode} must block ${operation}`,
  );
}

assert.equal(getLegacyDataApiMode(config(undefined)), 'compat');
assert.equal(getLegacyDataApiMode(config('unexpected')), 'compat');
assert.equal(getLegacyDataApiMode(config('compat')), 'compat');
assert.equal(getLegacyDataApiMode(config('read-only')), 'read-only');
assert.equal(getLegacyDataApiMode(config('disabled')), 'disabled');

for (const operation of ['GET', 'POST', 'PATCH', 'DELETE']) assertAllowed('compat', operation);

assertAllowed('read-only', 'GET');
for (const operation of ['POST', 'PATCH', 'DELETE']) assertBlocked('read-only', operation);

for (const operation of ['GET', 'POST', 'PATCH', 'DELETE']) assertBlocked('disabled', operation);

console.log('legacy-data-mode-check: ok');
