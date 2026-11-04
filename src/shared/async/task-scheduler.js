/** Bound concurrent work; queued tasks can check their owner's lifetime before starting. */
export function createTaskScheduler(limit = 2) {
  const queue = [];
  let running = 0;
  const drain = () => {
    while (running < limit && queue.length) {
      const { prepare, resolve, reject } = queue.shift();
      running++;
      Promise.resolve().then(prepare).then(resolve, reject).finally(() => { running--; drain(); });
    }
  };
  return prepare => new Promise((resolve, reject) => { queue.push({ prepare, resolve, reject }); drain(); });
}
