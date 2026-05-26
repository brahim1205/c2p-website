#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(repoRoot, 'out', 'assets');

const limits = {
  maxJsRawKb: Number(process.env.C2P_MAX_JS_CHUNK_KB ?? 560),
  maxJsGzipKb: Number(process.env.C2P_MAX_JS_CHUNK_GZIP_KB ?? 180),
  maxCssGzipKb: Number(process.env.C2P_MAX_CSS_GZIP_KB ?? 70),
  maxTotalJsGzipKb: Number(process.env.C2P_MAX_TOTAL_JS_GZIP_KB ?? 750),
};

function kb(bytes) {
  return bytes / 1024;
}

function formatKb(value) {
  return `${value.toFixed(1)} KB`;
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Build assets introuvables: ${dir}. Lancez npm run build avant bundle:budget.`);
  }
  return fs.readdirSync(dir)
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => {
      const filePath = path.join(dir, name);
      const raw = fs.readFileSync(filePath);
      return {
        name,
        rawKb: kb(raw.byteLength),
        gzipKb: kb(zlib.gzipSync(raw).byteLength),
        ext: path.extname(name),
      };
    });
}

function main() {
  const files = collectFiles(outDir);
  const failures = [];
  let totalJsGzipKb = 0;

  for (const file of files) {
    if (file.ext === '.js') {
      totalJsGzipKb += file.gzipKb;
      if (file.rawKb > limits.maxJsRawKb) {
        failures.push(`${file.name}: JS raw ${formatKb(file.rawKb)} > ${limits.maxJsRawKb} KB`);
      }
      if (file.gzipKb > limits.maxJsGzipKb) {
        failures.push(`${file.name}: JS gzip ${formatKb(file.gzipKb)} > ${limits.maxJsGzipKb} KB`);
      }
    }
    if (file.ext === '.css' && file.gzipKb > limits.maxCssGzipKb) {
      failures.push(`${file.name}: CSS gzip ${formatKb(file.gzipKb)} > ${limits.maxCssGzipKb} KB`);
    }
  }

  if (totalJsGzipKb > limits.maxTotalJsGzipKb) {
    failures.push(`Total JS gzip ${formatKb(totalJsGzipKb)} > ${limits.maxTotalJsGzipKb} KB`);
  }

  if (failures.length > 0) {
    console.error('Bundle budget: FAILED');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  const largest = [...files]
    .filter((file) => file.ext === '.js')
    .sort((a, b) => b.gzipKb - a.gzipKb)
    .slice(0, 5)
    .map((file) => ({ file: file.name, raw: formatKb(file.rawKb), gzip: formatKb(file.gzipKb) }));

  console.log(JSON.stringify({
    ok: true,
    totalJsGzip: formatKb(totalJsGzipKb),
    limits,
    largest,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('Bundle budget: FAILED');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
