import path from 'node:path';

const dependencies = {
  app: ['app', 'pages', 'workflows', 'features', 'integrations', 'shared'],
  pages: ['pages', 'workflows', 'features', 'shared'],
  workflows: ['workflows', 'features', 'shared'],
  features: ['features', 'shared'],
  integrations: ['integrations', 'shared'],
  shared: ['shared'],
};

export function countLines(source) {
  if (!source) return 0;
  return source.split(/\r?\n/).length - Number(source.endsWith('\n'));
}

export function maximumLines(file) {
  if (file.endsWith('.test.js') || file.startsWith('tests/')) return 400;
  if (/^src\/pages\/.*\/index\.js$|^src\/pages\/index\.js$/.test(file)) return 150;
  if (file === 'src/app/bootstrap.js') return 150;
  if (/\.(html|css)$/.test(file)) return 350;
  return 300;
}

function featureName(file) {
  return file.split('/')[2];
}

export function importViolation(importer, target) {
  if (!importer.startsWith('src/')) return null;
  if (!target.startsWith('src/')) return 'El código nuevo no puede importar legado o backend.';
  const layer = importer.split('/')[1];
  const targetLayer = target.split('/')[1];
  if (!dependencies[layer]?.includes(targetLayer)) {
    return `Dependencia prohibida: ${layer} → ${targetLayer}.`;
  }
  if (layer !== 'features' && targetLayer === 'features') {
    if (!/^src\/features\/[^/]+\/index\.js$/.test(target)) {
      return 'Consumir la interfaz pública index.js de la funcionalidad.';
    }
  }
  if (layer === 'features' && targetLayer === 'features') {
    if (featureName(importer) !== featureName(target)) {
      return 'Coordinar funcionalidades mediante workflows, sin imports cruzados.';
    }
  }
  if (/\/(model|data)\//.test(importer) && /\/(ui|state|application)\//.test(target)) {
    return 'Los modelos y datos no dependen de UI, estado ni casos de uso.';
  }
  return null;
}

export function relativeTarget(importer, specifier) {
  if (!specifier.startsWith('.')) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
}

export function importSpecifiers(ast) {
  const imports = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)) {
      if (typeof node.source?.value === 'string') imports.push(node.source.value);
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child?.type) visit(child);
    }
  }
  visit(ast);
  return imports;
}
