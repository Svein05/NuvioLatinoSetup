const transition = { duration: 350, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'both' };

export const contentHeight = content => parseFloat(getComputedStyle(content).height) || 0;

export function visualState(details, panel, content) {
  const style = getComputedStyle(content);
  return { height: details.open ? getComputedStyle(panel).height : '0px',
    opacity: details.open ? style.opacity : '0', filter: details.open ? style.filter : 'blur(2px)' };
}

export function animatePanel({ panel, content, open, reduced, from }) {
  const height = contentHeight(content);
  const destination = open ? height + 'px' : '0px';
  const animations = [];
  panel.style.height = reduced ? destination : from.height;
  panel.dataset.animating = '';
  if (!reduced) {
    panel.style.setProperty('--disclosure-content-height', height + 'px');
    animations.push(panel.animate([{ height: from.height }, { height: destination }], transition));
  }
  animations.push(content.animate([{ opacity: from.opacity, filter: from.filter },
    { opacity: open ? '1' : '0', filter: open ? 'none' : 'blur(2px)' }], transition));
  return { height, animations };
}
