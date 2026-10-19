/** Own listeners, scheduled frames and observers until a view is disposed. */
export function createLifetime() {
  const controller = new AbortController();
  const cleanups = new Set();
  const add = cleanup => { cleanups.add(cleanup); return cleanup; };
  function frame(callback) {
    if (controller.signal.aborted) return;
    const id = requestAnimationFrame(time => {
      cleanups.delete(cancel);
      if (!controller.signal.aborted) callback(time);
    });
    const cancel = add(() => cancelAnimationFrame(id));
  }
  return {
    signal: controller.signal,
    add,
    frame,
    timeout(callback, milliseconds) {
      if (controller.signal.aborted) return;
      const id = setTimeout(() => {
        cleanups.delete(cancel);
        if (!controller.signal.aborted) callback();
      }, milliseconds);
      const cancel = add(() => clearTimeout(id));
    },
    on(target, event, listener, options = {}) {
      target?.addEventListener(event, listener, { ...options, signal: controller.signal });
    },
    dispose() {
      if (controller.signal.aborted) return;
      controller.abort();
      for (const cleanup of cleanups) cleanup();
      cleanups.clear();
    },
  };
}
