import { parse, serialize, serializeOuter } from 'parse5';

function sizesFor(node, source) {
  const attrs = new Map(node.attrs.map(attr => [attr.name, attr.value]));
  const width = Number(attrs.get('width'));
  if (source.includes('/badges/')) return `${Math.max(16, width || 64)}px`;
  if (source.includes('hero-posters-backdrop')) return '100vw';
  if (width && width <= 80) return `${width}px`;
  if (source.includes('/profile_icons/')) return '(max-width: 640px) 28vw, 160px';
  return '(max-width: 640px) 40vw, (max-width: 1023px) 28vw, 320px';
}

export function responsiveHtml(html, images) {
  const document = parse(html);
  function visit(node, decorative = false) {
    if (node.tagName === 'noscript') return;
    const classes = node.attrs?.find(attr => attr.name === 'class')?.value || '';
    decorative ||= /(?:^|\s)(story-stage|account-showcase-panels)(?:\s|$)/.test(classes);
    if (node.tagName === 'img') {
      const attrs = new Map(node.attrs.map(attr => [attr.name, attr.value]));
      let source;
      try { source = decodeURI((attrs.get('src') || '').split(/[?#]/)[0]); } catch { source = ''; }
      const image = images[source];
      if (image) {
        attrs.set('srcset', image.variants.map(item => `${item.url} ${item.width}w`).join(', '));
        attrs.set('sizes', sizesFor(node, source));
        if (!attrs.has('width')) attrs.set('width', String(image.width));
        if (!attrs.has('height')) attrs.set('height', String(image.height));
        attrs.set('decoding', 'async');
        if (source.includes('hero-posters-backdrop')) attrs.set('fetchpriority', 'high');
        else if (!source.includes('/logo/')) attrs.set('loading', 'lazy');
        node.attrs = [...attrs].map(([name, value]) => ({ name, value }));
      }
      if (decorative && node.parentNode) {
        const fallback = { nodeName: 'noscript', tagName: 'noscript', attrs: [], namespaceURI: node.namespaceURI,
          parentNode: node.parentNode, childNodes: [] };
        fallback.childNodes.push({ nodeName: '#text', value: serializeOuter(node), parentNode: fallback });
        node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node) + 1, 0, fallback);
        node.attrs = node.attrs.map(attr => ['src', 'srcset', 'sizes'].includes(attr.name)
          ? { name: 'data-deferred-' + attr.name, value: attr.value } : attr);
      }
    }
    [...(node.childNodes || [])].forEach(child => visit(child, decorative));
    if (node.content) visit(node.content, decorative);
  }
  visit(document);
  return serialize(document);
}
