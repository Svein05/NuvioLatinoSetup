export function showModderToast(message, type = 'info') {
  if (typeof document === 'undefined') return;
  let container = document.getElementById('modderToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modderToastContainer';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success'
    ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300'
    : type === 'error'
      ? 'bg-rose-950/95 border-rose-500/50 text-rose-300'
      : 'bg-zinc-900/95 border-white/20 text-white';

  const iconClass = type === 'success'
    ? 'fa-circle-check text-emerald-400'
    : type === 'error'
      ? 'fa-triangle-exclamation text-rose-400'
      : 'fa-info-circle text-amber-300';

  toast.className = `p-3.5 rounded-xl border backdrop-blur-md shadow-2xl text-xs flex items-center gap-2.5 transition-all transform translate-y-4 opacity-0 pointer-events-auto ${bgClass}`;
  toast.innerHTML = `<i class="fa-solid ${iconClass} text-sm shrink-0"></i><span class="flex-1 font-medium">${message}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
