export function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

/** Native sticky travel: both columns remain visible through the final hold. */
export function pinnedProgress(rectangle, viewportHeight) {
  const frameHeight = viewportHeight - 150;
  return clamp((120 - rectangle.top) / Math.max(1, rectangle.height - frameHeight));
}

export function chapterProgress(rectangles, viewportHeight) {
  const anchor = viewportHeight * .45;
  let index = 0;
  rectangles.forEach((rectangle, candidate) => {
    if (rectangle.top <= anchor) index = candidate;
  });
  const rectangle = rectangles[index];
  return { index, progress: pinnedProgress(rectangle, viewportHeight) };
}

function phase(progress, start, end) {
  const value = clamp((progress - start) / (end - start));
  return value * value * (3 - 2 * value);
}

export function chapterTimeline(progress) {
  return {
    reveal: phase(progress, .06, .24),
    detail: phase(progress, .24, .46),
    finish: phase(progress, .46, .68),
  };
}

export function accountProgress(rectangle, viewportHeight) {
  return accountTimeline(pinnedProgress(rectangle, viewportHeight));
}

export function accountTimeline(progress) {
  const timeline = chapterTimeline(progress);
  return {
    activity: timeline.reveal,
    avatar: timeline.detail,
    change: timeline.finish,
  };
}
