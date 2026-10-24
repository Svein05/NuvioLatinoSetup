/** Follow scroll-derived targets at a bounded visual speed, without controlling scroll. */
export function createScenePlayback() {
  const values = new WeakMap();
  let lastTime;
  let elapsed = 16;
  let pending = false;
  return {
    begin(time) {
      elapsed = lastTime === undefined ? 16 : Math.max(0, Math.min(32, time - lastTime));
      lastTime = time;
      pending = false;
    },
    value(key, target, snap = false) {
      const previous = values.get(key) ?? 0;
      const distance = target - previous;
      const step = .4 * elapsed / 1000;
      const value = snap || Math.abs(distance) <= step ? target : previous + Math.sign(distance) * step;
      values.set(key, value);
      pending ||= Math.abs(target - value) > .00001;
      return value;
    },
    pending: () => pending,
  };
}
