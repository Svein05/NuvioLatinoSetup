const ignored = 'a,button,input,textarea,select,[contenteditable="true"]';

function insidePresentation(event, zones, reduced) {
  if (reduced.matches || event.ctrlKey || event.metaKey || event.target.closest?.(ignored)) return false;
  const middle = window.innerHeight / 2;
  return zones.some(zone => {
    const bounds = zone.getBoundingClientRect();
    return bounds.top < middle && bounds.bottom > middle;
  });
}

function createPacedScroll() {
  let pending = 0;
  let frame = 0;
  let previous = 0;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; pending = 0; previous = 0; };
  const step = time => {
    const elapsed = previous ? Math.min(32, time - previous) : 16;
    previous = time;
    const distance = Math.sign(pending) * Math.min(Math.abs(pending), window.innerHeight * .35 * elapsed / 1000);
    const before = window.scrollY;
    window.scrollBy({ top: distance, behavior: 'instant' });
    pending -= distance;
    if (Math.abs(pending) > .5 && window.scrollY !== before && !document.hidden) frame = requestAnimationFrame(step);
    else stop();
  };
  const enqueue = distance => {
    const limit = window.innerHeight * .45;
    if (Math.sign(distance) !== Math.sign(pending)) pending = 0;
    pending = Math.max(-limit, Math.min(limit, pending + distance));
    if (!frame) frame = requestAnimationFrame(step);
  };
  return { stop, enqueue };
}

/** Bound deliberate wheel/touch travel only within the decorative presentation. */
export function initPresentationScroll({ zones, reduced, root = document }) {
  const { stop, enqueue } = createPacedScroll();
  let touchY = null;
  let touchX = 0;
  const wheel = event => {
    if (!event.cancelable || Math.abs(event.deltaX) > Math.abs(event.deltaY)
      || !insidePresentation(event, zones, reduced)) { stop(); return; }
    event.preventDefault();
    enqueue(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1));
  };
  const touchStart = event => {
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    touchX = event.touches[0]?.clientX || 0;
    stop();
  };
  const touchMove = event => {
    if (touchY === null || event.touches.length !== 1 || !event.cancelable) { touchY = null; stop(); return; }
    const next = event.touches[0].clientY;
    const distance = touchY - next;
    const horizontal = touchX - event.touches[0].clientX;
    touchX = event.touches[0].clientX;
    touchY = next;
    if (Math.abs(horizontal) > Math.abs(distance) || !insidePresentation(event, zones, reduced)) { stop(); return; }
    event.preventDefault();
    enqueue(distance);
  };
  const touchEnd = () => { touchY = null; };
  const events = [['wheel', wheel, false], ['touchstart', touchStart, true], ['touchmove', touchMove, false],
    ['touchend', touchEnd, true], ['touchcancel', stop, true], ['keydown', stop, true], ['click', stop, true], ['visibilitychange', stop, true]];
  events.forEach(([type, listener, passive]) => root.addEventListener(type, listener, { passive }));
  window.addEventListener('pagehide', stop);
  reduced.addEventListener('change', stop);
  return () => {
    stop();
    events.forEach(([type, listener]) => root.removeEventListener(type, listener));
    window.removeEventListener('pagehide', stop);
    reduced.removeEventListener('change', stop);
  };
}
