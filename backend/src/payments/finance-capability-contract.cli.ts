import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildFinanceCapabilityContractDescriptor,
  financeCapabilityContractDescriptorSchema,
} from './finance-capability-contract.js';

async function main() {
  const descriptor = buildFinanceCapabilityContractDescriptor();
  const fixturePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'finance-capabilities-contract.v1.json',
  );
  const fixtureRaw = await readFile(fixturePath, 'utf8');
  const fixture = financeCapabilityContractDescriptorSchema.parse(JSON.parse(fixtureRaw));

  assert.deepStrictEqual(
    descriptor,
    fixture,
    'Le contrat capabilities v1 a dérivé de la fixture officielle.',
  );

  console.log(JSON.stringify({
    ok: true,
    contractVersion: descriptor.contractVersion,
    machineVersion: descriptor.machineVersion,
    entities: descriptor.entities.length,
    actions: descriptor.actions.length,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
