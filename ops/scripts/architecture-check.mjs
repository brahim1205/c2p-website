import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const sourceRoots = [
  resolve(repoRoot, 'backend/src'),
  resolve(repoRoot, 'front/src'),
];
const extensions = ['.ts', '.tsx'];
const defaultMaxLines = 900;

const allowedLargeFiles = new Map([
  ['backend/src/data/data.controller.ts', 500],
  ['backend/src/data/mock-store.ts', 3400],
  ['backend/src/database/wallet.service.ts', 1300],
  ['backend/src/auth/auth.service.ts', 1500],
  ['backend/src/payments/provider-integration.service.ts', 1100],
  ['front/src/pages/dashboard/paiements/page.tsx', 1350],
  ['front/src/pages/admin/payments/page.tsx', 1180],
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'out') continue;
      walk(path, files);
      continue;
    }
    if (extensions.includes(extname(path))) {
      files.push(path);
    }
  }
  return files;
}

function toRepoPath(path) {
  return normalize(relative(repoRoot, path)).replaceAll('\\', '/');
}

function countLines(content) {
  if (!content) return 0;
  return content.split('\n').length;
}

function withoutExtension(path) {
  return path.replace(/\.(ts|tsx)$/, '');
}

function resolveImport(fromFile, specifier, knownFiles) {
  if (specifier.startsWith('@/')) {
    return resolveCandidate(resolve(repoRoot, 'front/src', specifier.slice(2)), knownFiles);
  }

  if (!specifier.startsWith('.')) {
    return null;
  }

  return resolveCandidate(resolve(dirname(fromFile), specifier), knownFiles);
}

function resolveCandidate(basePath, knownFiles) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    join(basePath, 'index.ts'),
    join(basePath, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (knownFiles.has(normalized) || existsSync(normalized)) {
      return knownFiles.has(normalized) ? normalized : null;
    }
  }

  return null;
}

function extractImports(content) {
  const imports = [];
  const patterns = [
    /import\s+(?!type\b)(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+(?!type\b)(?:[\s\S]*?\s+from\s+)['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

function findCycles(graph) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycleKeys = new Set();

  function visit(node) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      if (start === -1) return;
      const cycle = [...stack.slice(start), node];
      const names = cycle.map(toRepoPath);
      const key = [...new Set(names)].sort().join('|');
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        cycles.push(names);
      }
      return;
    }

    if (visited.has(node)) return;

    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      visit(next);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }

  return cycles;
}

const files = sourceRoots.flatMap((root) => walk(root));
const knownFiles = new Set(files.map((file) => normalize(file)));
const oversized = [];
const largest = [];
const graph = new Map();

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const repoPath = toRepoPath(file);
  const lines = countLines(content);
  const maxLines = allowedLargeFiles.get(repoPath) ?? defaultMaxLines;

  largest.push({ repoPath, lines });
  if (lines > maxLines) {
    oversized.push({ repoPath, lines, maxLines });
  }

  const deps = extractImports(content)
    .map((specifier) => resolveImport(file, specifier, knownFiles))
    .filter(Boolean)
    .filter((dependency) => withoutExtension(dependency) !== withoutExtension(file));

  graph.set(file, [...new Set(deps)]);
}

const cycles = findCycles(graph);
largest.sort((left, right) => right.lines - left.lines);

if (oversized.length > 0 || cycles.length > 0) {
  if (oversized.length > 0) {
    console.error('Architecture check: fichiers au-dessus du budget:');
    for (const entry of oversized) {
      console.error(`- ${entry.repoPath}: ${entry.lines} lignes (budget ${entry.maxLines})`);
    }
  }

  if (cycles.length > 0) {
    console.error('Architecture check: cycles detectes:');
    for (const cycle of cycles.slice(0, 20)) {
      console.error(`- ${cycle.join(' -> ')}`);
    }
    if (cycles.length > 20) {
      console.error(`... ${cycles.length - 20} cycle(s) supplementaire(s)`);
    }
  }

  process.exit(1);
}

console.log('Architecture check: OK');
console.log('Plus gros fichiers suivis:');
for (const entry of largest.slice(0, 12)) {
  console.log(`- ${entry.repoPath}: ${entry.lines} lignes`);
}
