/** Provider names are external data, never markup. */
export function renderVerifiedKeyStatus(container, { user, plan }) {
  const label = document.createElement('span');
  label.className = 'text-emerald-400 font-medium flex items-center gap-1';
  label.title = plan || 'Válido';
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-check text-[10px]';
  label.append(icon, document.createTextNode(` ${user || 'Válida'}`));
  container.replaceChildren(label);
}

export function renderUnverifiedKeyStatus(container, { status, error }) {
  const label = document.createElement('span');
  label.className = 'text-rose-400 font-medium flex items-center gap-1';
  label.title = error || 'No se pudo verificar la clave.';
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-xmark text-[10px]';
  label.append(icon, document.createTextNode(status === 'invalid' ? ' Clave no válida' : ' Sin verificar'));
  container.replaceChildren(label);
}
