import { createLifetime } from '../lifetime.js';

const instances = new WeakMap();

function valueNode(value, className) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = value;
  return node;
}

function rollingDigits(previous, next) {
  const digits = [next];
  const steps = (next - previous + 10) % 10 || 10;
  let current = next;
  for (let index = 1; index <= steps; index++) {
    current = (current - 1 + 10) % 10;
    digits.push(current);
    if (current === previous) break;
  }
  return digits;
}

function animatedDigit(previous, next, lifetime, options) {
  const strip = valueNode('', 'odometer-digit-strip');
  const digits = rollingDigits(previous, next);
  strip.append(...digits.map(digit => valueNode(String(digit), 'odometer-digit-val')));
  strip.style.transform = `translateY(-${(digits.length - 1) * 1.15}em)`;
  strip.style.transition = 'none';
  lifetime.frame(() => lifetime.frame(() => {
    strip.style.transition = `transform ${(options.durationMs ?? 720) / 1000}s cubic-bezier(0.16, 1, 0.3, 1) ${options.delayMs / 1000}s`;
    strip.style.transform = 'translateY(0)';
  }));
  return strip;
}

function character(previous, next, lifetime, options) {
  if (!/\d/.test(next)) return valueNode(next, 'odometer-static-char');
  const slot = valueNode('', 'odometer-digit-slot');
  slot.dataset.digit = next;
  const before = /\d/.test(previous) ? Number(previous) : null;
  slot.append(before !== null && (before !== Number(next) || options.initial)
    ? animatedDigit(before, Number(next), lifetime, options) : valueNode(next, 'odometer-digit-val'));
  return slot;
}

export function renderOdometer(container, textValue, animate = false, options = {}) {
  if (!container) return () => {};
  const previous = instances.get(container);
  previous?.lifetime.dispose();
  const lifetime = createLifetime();
  const text = String(textValue);
  const initial = Boolean(options.animateInitial && !previous);
  const motion = animate && (previous?.text || initial) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const length = motion ? Math.max(previous?.text?.length || 0, text.length) : text.length;
  const before = motion ? (initial ? text : previous.text).padStart(length, ' ') : ''.padStart(length, ' ');
  const after = text.padStart(length, ' ');
  const wrapper = valueNode('', 'odometer-wrapper');
  for (let index = 0; index < length; index++) {
    if (after[index] !== ' ') wrapper.append(character(before[index], after[index], lifetime,
      { ...options, initial: motion && initial, delayMs: index * (options.staggerMs || 0) }));
  }
  container.replaceChildren(wrapper);
  instances.set(container, { text, lifetime });
  return () => {
    lifetime.dispose();
    if (instances.get(container)?.lifetime === lifetime) instances.delete(container);
  };
}
