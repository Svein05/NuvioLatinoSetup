export function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

/** Anchor chapter selection to the reading area, independent of scroll direction. */
export function chapterProgress(rectangles, viewportHeight) {
  const anchor = viewportHeight * .45;
  let index = 0;
  rectangles.forEach((rectangle, candidate) => {
    if (rectangle.top <= anchor) index = candidate;
  });
  const rectangle = rectangles[index];
  const progress = clamp((anchor - rectangle.top) / Math.max(1, rectangle.height));
  return { index, progress, spread: Math.sin(progress * Math.PI) };
}

export function accountProgress(rectangle, viewportHeight) {
  const progress = clamp((viewportHeight * .9 - rectangle.top) / (rectangle.height * .7 + viewportHeight * .25));
  return {
    activity: clamp(progress / .35),
    avatar: clamp((progress - .25) / .3),
    change: clamp((progress - .55) / .3),
  };
}
