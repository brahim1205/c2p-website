#!/usr/bin/env node
// Design guard: keeps the frontend from drifting further away from the design system.
//  1. Tailwind opacity modifiers outside the default scale (bg-white/92, opacity-14...) are
//     silently dropped by Tailwind 3: they must be written as arbitrary values (bg-white/[0.92]).
//  2. Hard-coded hex colours in classes (`text-[#0f1c35]`) may only go down: use the `c2p-*`
//     tokens or the components of `src/components/ui` instead. Lower HEX_BASELINE when it drops.
//  3. Images in public/images must stay under 1 MB (convert to WebP, resize to display size).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const frontRoot = resolve(new URL('..', import.meta.url).pathname);
const HEX_BASELINE = 1625;
const MAX_IMAGE_BYTES = 1024 * 1024;
// Kept on purpose: possibly referenced by production content, see docs before removing.
const IMAGE_ALLOWLIST = new Set(['public/images/home/acceuil.png']);
const TAILWIND_OPACITY_SCALE = new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);

function walk(directory, accept) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return walk(path, accept);
    return accept(path) ? [path] : [];
  });
}

const failures = [];
const sources = walk(join(frontRoot, 'src'), (path) => /\.(ts|tsx)$/.test(path) && !path.endsWith('.d.ts'));
const colorModifier = /(?<![\w-])((?:[a-z-]+:)*(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|divide|outline|decoration|placeholder|caret|accent)-(?:\[[^\]]+\]|[a-z]+(?:-\d{2,3})?))\/(\d+)(?![\d\]])/g;
const opacityUtility = /(?<![\w-])((?:[a-z-]+:)*(?:opacity|bg-opacity|text-opacity|border-opacity))-(\d+)(?![\d\]])/g;
let hexCount = 0;

for (const file of sources) {
  const content = readFileSync(file, 'utf8');
  const rel = relative(frontRoot, file);
  hexCount += (content.match(/\[#[0-9A-Fa-f]{3,8}\]/g) ?? []).length;
  content.split('\n').forEach((line, index) => {
    for (const pattern of [colorModifier, opacityUtility]) {
      for (const match of line.matchAll(pattern)) {
        if (!TAILWIND_OPACITY_SCALE.has(Number(match[2]))) {
          failures.push(`${rel}:${index + 1} classe d'opacite ignoree par Tailwind: "${match[0]}" (ecrire /[0.${match[2].padStart(2, '0')}])`);
        }
      }
    }
  });
}

if (hexCount > HEX_BASELINE) {
  failures.push(`Couleurs hexadecimales en dur: ${hexCount} > ${HEX_BASELINE}. Utiliser les jetons c2p-* ou src/components/ui.`);
}

for (const image of walk(join(frontRoot, 'public/images'), () => true)) {
  const rel = relative(frontRoot, image);
  const size = statSync(image).size;
  if (size > MAX_IMAGE_BYTES && !IMAGE_ALLOWLIST.has(rel)) {
    failures.push(`${rel}: ${(size / 1048576).toFixed(1)} Mo > 1 Mo (convertir en WebP et redimensionner).`);
  }
}

console.log(JSON.stringify({ ok: failures.length === 0, hexCount, hexBaseline: HEX_BASELINE, failures }, null, 2));
if (failures.length > 0) process.exitCode = 1;
