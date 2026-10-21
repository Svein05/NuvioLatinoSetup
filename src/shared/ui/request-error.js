/** Keep unavailable data visually distinct from a successful empty response. */
export function renderRequestError(container, message) {
  if (!container) return;
  const notice = document.createElement('div');
  notice.className = 'col-span-full py-8 px-4 text-center text-xs text-amber-200/80 bg-white/[0.02] border border-white/[0.06] rounded-2xl';
  notice.setAttribute('role', 'status');
  notice.textContent = message;
  container.replaceChildren(notice);
}
