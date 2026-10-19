import { createLifetime } from '../lifetime.js';

const badges = {
  info: ['fa-circle-info', 'bg-white/[0.08] border-white/20 text-[#ffd479]'],
  success: ['fa-check', 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'],
  error: ['fa-xmark', 'bg-rose-500/15 border-rose-500/30 text-rose-400'],
  warning: ['fa-triangle-exclamation', 'bg-amber-500/15 border-amber-500/30 text-amber-300'],
};

function toastContainer(id, create) {
  let container = document.getElementById(id);
  if (!container && create) {
    container = document.createElement('div');
    container.id = id;
    container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.append(container);
  }
  return container;
}

function toastContents(message, type, compact) {
  const icon = document.createElement('i');
  const label = document.createElement('span');
  if (compact) {
    icon.className = type === 'success' ? 'fa-solid fa-circle-check text-emerald-400'
      : type === 'error' ? 'fa-solid fa-circle-xmark text-rose-400' : 'fa-solid fa-circle-info text-amber-300';
    label.textContent = message;
    return [icon, label];
  }
  const [name, color] = badges[type] || badges.info;
  const badge = document.createElement('div');
  badge.className = `w-6 h-6 rounded-full border ${color} flex items-center justify-center shrink-0 text-[11px] shadow-[var(--brillo-vidrio)]`;
  icon.className = `fa-solid ${name}`;
  badge.append(icon);
  label.className = 'text-white/90 text-xs font-medium leading-snug';
  label.textContent = String(message).replace(/^(?:✓|✔|🎉|⚠️?|💡)\s*/u, '').trim();
  return [badge, label];
}

/** Render external/error messages as text; return cleanup for timers and scheduled animation. */
export function showToast(message, { type = 'info', duration = 3500, containerId = 'toastContainer', compact = false, createContainer = false } = {}) {
  const container = toastContainer(containerId, createContainer);
  if (!container) return () => {};
  const lifetime = createLifetime();
  const toast = document.createElement('div');
  toast.className = 'lat-toast is-entering';
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.append(...toastContents(message, type, compact));
  container.append(toast);
  const dispose = () => { lifetime.dispose(); toast.remove(); };
  lifetime.frame(() => { if (!compact) toast.classList.remove('is-entering'); toast.classList.add('is-visible'); });
  lifetime.timeout(() => {
    toast.classList.remove('is-visible');
    toast.classList.add('is-leaving');
    lifetime.timeout(dispose, compact ? 300 : 280);
  }, duration);
  return dispose;
}
