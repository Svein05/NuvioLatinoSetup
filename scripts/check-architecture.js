import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';
import { countLines, importSpecifiers, importViolation, maximumLines, relativeTarget } from './architecture-policy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(readFileSync(new URL('../docs/architecture/legacy-baseline.json', import.meta.url)));
const violations = [];
const graph = new Map();

function collect(directory) {
  const absolute = path.join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return collect(relative);
    return /\.(js|html|css)$/.test(entry.name) ? [relative] : [];
  });
}

function checkImport(file, specifier) {
  const target = relativeTarget(file, specifier);
  if (!target) return;
  if (!existsSync(path.join(root, target))) {
    if (baseline[file] && target.endsWith('.local.js')) return;
    violations.push(`${file}: import inexistente ${specifier}`);
  }
  graph.get(file).push(target);
  if (baseline[file]) return;
  const violation = importViolation(file, target);
  if (violation) violations.push(`${file}: ${violation} (${specifier})`);
}

function inspect(file) {
  const source = readFileSync(path.join(root, file), 'utf8');
  const max = baseline[file] ?? maximumLines(file);
  const actual = countLines(source);
  if (actual > max) violations.push(`${file}: ${actual} líneas; máximo ${max}.`);
  if (!file.endsWith('.js')) return;
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  graph.set(file, []);
  for (const specifier of importSpecifiers(ast)) checkImport(file, specifier);
}

function checkCycles() {
  const visited = new Set();
  const active = new Set();
  function visit(file, trail) {
    if (active.has(file)) {
      violations.push(`Ciclo: ${[...trail, file].join(' → ')}`);
      return;
    }
    if (visited.has(file)) return;
    active.add(file);
    for (const target of graph.get(file) ?? []) visit(target, [...trail, file]);
    active.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file, []);
}

const legacy = Object.keys(baseline).filter(file => existsSync(path.join(root, file)));
const files = new Set([
  ...collect('src'), ...collect('worker'), ...collect('scripts'),
  ...collect('tests'), ...collect('config'), ...legacy,
]);
for (const file of files) inspect(file);
checkCycles();
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Arquitectura y tamaños verificados: ${files.size} archivos; legado acotado explícitamente.`);
}
