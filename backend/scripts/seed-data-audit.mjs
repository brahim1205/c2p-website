import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = [
  resolve(process.cwd(), 'src/auth/auth.store.ts'),
  resolve(process.cwd(), 'src/data/mock-store.ts'),
];

const bannedPatterns = [
  { label: 'placeholder-host', values: ['example.com', 'meet.example.com', 'videos.example.com', 'files.example.com'] },
  { label: 'test-wording', values: ['parcours test', 'classe test', 'demo data', 'fake'] },
];

const findings = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const normalizedSource = source.toLowerCase();
  for (const { label, values } of bannedPatterns) {
    for (const value of values) {
      if (!normalizedSource.includes(value)) continue;
      findings.push({
        file,
        label,
        snippet: value,
      });
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.label}: ${finding.file} -> ${finding.snippet}`);
  }
  process.exit(1);
}

console.log('seed-data-audit: ok');
