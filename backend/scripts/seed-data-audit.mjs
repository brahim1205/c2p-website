import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = [
  resolve(process.cwd(), 'src/auth/auth.store.ts'),
  resolve(process.cwd(), 'src/data/mock-store.ts'),
];

const bannedPatterns = [
  { label: 'placeholder-host', pattern: /example\.com|meet\.example\.com|videos\.example\.com|files\.example\.com/gi },
  { label: 'placeholder-email', pattern: /[A-Za-z0-9._%+-]+@example\.com/gi },
  { label: 'test-wording', pattern: /\b(parcours test|classe test|demo data|fake)\b/gi },
];

const findings = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const { label, pattern } of bannedPatterns) {
    for (const match of source.matchAll(pattern)) {
      findings.push({
        file,
        label,
        snippet: match[0],
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
