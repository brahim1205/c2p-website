import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const rootDir = new URL('..', import.meta.url).pathname;
const srcDir = join(rootDir, 'src');
const baseUrl = (process.env.BACKEND_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/$/, '');

async function fetchJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: 'application/json' },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} did not return JSON: ${error.message}`);
  }
}

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: 'text/html,*/*' },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }
  return text;
}

async function listControllerFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listControllerFiles(path);
    }
    return entry.isFile() && entry.name.endsWith('.controller.ts') ? [path] : [];
  }));
  return files.flat();
}

function parseStringLiteral(raw) {
  const match = raw.trim().match(/^['"`]([^'"`]*)['"`]/);
  return match?.[1] ?? '';
}

function normalizeRoutePath(prefix, route, apiPrefix) {
  const parts = [apiPrefix, prefix, route]
    .map((part) => trimSlashes(part.trim()))
    .filter(Boolean);
  return normalizeRouteParams(`/${parts.join('/')}`);
}

function trimSlashes(value) {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === '/') start += 1;
  while (end > start && value[end - 1] === '/') end -= 1;
  return value.slice(start, end);
}

function normalizeRouteParams(path) {
  const segments = path.split('/').filter(Boolean);
  return `/${segments.map((segment) => {
    if (segment.startsWith(':')) return `{${segment.slice(1)}}`;
    if (segment.startsWith('*')) return `{${segment.slice(1)}}`;
    return segment;
  }).join('/')}`;
}

async function parseControllerRoutes(file, apiPrefix) {
  const source = await readFile(file, 'utf8');
  const controllerMatch = source.match(/@Controller\s*\(([^)]*)\)/);
  if (!controllerMatch) {
    return [];
  }

  const controllerPrefix = parseStringLiteral(controllerMatch[1]);
  const routes = [];
  const methodRegex = /@(Get|Post|Put|Patch|Delete|All)\s*\(([^)]*)\)/g;
  let methodMatch;

  while ((methodMatch = methodRegex.exec(source)) !== null) {
    const decorator = methodMatch[1].toLowerCase();
    const route = parseStringLiteral(methodMatch[2]);
    const methods = decorator === 'all' ? ['get', 'post', 'put', 'patch', 'delete'] : [decorator];

    for (const method of methods) {
      routes.push({
        method,
        path: normalizeRoutePath(controllerPrefix, route, apiPrefix),
        file: relative(rootDir, file),
      });
    }
  }

  return routes;
}

async function main() {
  const html = await fetchText('/api/docs');
  if (!/swagger-ui|SwaggerUIBundle/i.test(html)) {
    throw new Error('/api/docs did not return the Swagger UI HTML.');
  }

  const document = await fetchJson('/api/docs-json');
  if (!String(document.openapi ?? '').startsWith('3.')) {
    throw new Error('/api/docs-json is not an OpenAPI 3 document.');
  }
  if (!document.paths || typeof document.paths !== 'object') {
    throw new Error('/api/docs-json does not contain a valid paths object.');
  }

  const swaggerPaths = Object.keys(document.paths);
  const apiPrefix = swaggerPaths.some((path) => path === '/api' || path.startsWith('/api/')) ? '/api' : '';
  const controllerFiles = await listControllerFiles(srcDir);
  const expectedRoutes = (await Promise.all(controllerFiles.map((file) => parseControllerRoutes(file, apiPrefix)))).flat();
  const missingRoutes = expectedRoutes.filter((route) => !document.paths[route.path]?.[route.method]);

  if (missingRoutes.length > 0) {
    const lines = missingRoutes
      .map((route) => `${route.method.toUpperCase()} ${route.path} (${route.file})`)
      .join('\n');
    throw new Error(`Swagger document is missing ${missingRoutes.length} controller route(s):\n${lines}`);
  }

  const safeChecks = [
    ['/api', 'GET'],
    ['/api/healthz', 'GET'],
    ['/api/public/platform-status', 'GET'],
    ['/api/public/subscription-plans', 'GET'],
  ];

  for (const [path, method] of safeChecks) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { accept: 'application/json' } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${path} returned ${response.status}: ${text.slice(0, 300)}`);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    openapi: document.openapi,
    paths: swaggerPaths.length,
    controllerRoutes: expectedRoutes.length,
    checkedSafeEndpoints: safeChecks.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    baseUrl,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
