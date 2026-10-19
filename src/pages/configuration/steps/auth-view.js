const tabBase = 'relative z-10 flex-1 py-2 px-3 rounded-full text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 focus:outline-none';
const inputBase = 'w-full px-4 py-3 pr-10 rounded-[16px] bg-white/[0.04] text-sm text-white placeholder:text-white/30 shadow-[var(--brillo-vidrio)] transition-all focus:outline-none focus:ring-2';

export function authElements(root) {
  const ids = { email: 'nuvioEmail', password: 'nuvioPassword', confirmation: 'nuvioPasswordConfirm',
    login: 'btnNuvioConnect', signup: 'btnNuvioSignup', loginTab: 'tabAuthLogin', signupTab: 'tabAuthSignup',
    manual: 'btnContinueWithoutAccount', form: 'authForm' };
  return Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, root.querySelector(`#${id}`)]));
}

export function renderPasswordMatch(elements, mode, root) {
  const badge = root.querySelector('#passwordMatchBadge');
  if (mode !== 'signup' || !elements.confirmation || !badge) return;
  const confirmation = elements.confirmation.value;
  const equal = elements.password?.value === confirmation;
  if (!confirmation) {
    badge.className = 'text-[11px] text-white/40 mt-1 hidden flex items-center gap-1 font-medium';
    badge.replaceChildren();
    elements.confirmation.className = `${inputBase} border border-white/[0.12] focus:border-white/40 focus:ring-white/10`;
    return;
  }
  const color = equal ? 'text-emerald-400' : 'text-rose-400';
  elements.confirmation.className = `${inputBase} border ${equal
    ? 'border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/20'
    : 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/20'}`;
  badge.className = `text-[11px] ${color} mt-1 flex items-center gap-1 font-medium`;
  const icon = document.createElement('i');
  icon.className = `fa-solid fa-circle-${equal ? 'check' : 'xmark'} ${color} text-xs`;
  const label = document.createElement('span');
  label.textContent = equal ? 'Las contraseñas coinciden perfectamente.' : 'Las contraseñas no coinciden.';
  badge.replaceChildren(icon, label);
}

export function renderAuthMode(elements, mode, root) {
  const signup = mode === 'signup';
  root.querySelector('#authPillIndicator')?.classList.toggle('signup', signup);
  for (const [button, selected] of [[elements.loginTab, !signup], [elements.signupTab, signup]]) {
    if (button) button.className = `${tabBase} ${selected ? 'font-semibold text-[#08090c]' : 'font-medium text-white/60 hover:text-white'}`;
  }
  const heading = root.querySelector('#authHeadingText');
  if (heading) heading.textContent = signup ? 'Crear una nueva cuenta en Nuvio' : 'Conectar con tu cuenta de Nuvio';
  for (const id of ['authHintText', 'confirmPasswordGroup']) root.querySelector(`#${id}`)?.classList.toggle('hidden', !signup);
  if (elements.login) elements.login.style.display = signup ? 'none' : 'flex';
  if (elements.signup) elements.signup.style.display = signup ? 'flex' : 'none';
  if (!signup) {
    if (elements.confirmation) elements.confirmation.value = '';
    for (const input of [elements.password, elements.confirmation]) if (input) input.type = 'password';
    for (const id of ['btnToggleNuvioPassword', 'btnToggleNuvioPasswordConfirm']) {
      const button = root.querySelector(`#${id}`);
      if (button) {
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', 'Mostrar contraseña');
        button.title = 'Mostrar contraseña';
      }
      const icon = button?.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-eye text-xs pointer-events-none';
    }
    root.querySelector('#passwordMatchBadge')?.classList.add('hidden');
  }
  renderPasswordMatch(elements, mode, root);
}

export function renderAuthBusy(elements, mode, busy) {
  for (const button of [elements.login, elements.signup, elements.manual, elements.loginTab, elements.signupTab]) {
    if (button) button.disabled = busy;
  }
  const button = elements[mode];
  if (!button) return;
  const icon = busy ? 'fa-spinner fa-spin' : mode === 'signup' ? 'fa-user-plus' : 'fa-arrow-right-to-bracket';
  const label = busy ? mode === 'signup' ? 'Registrando cuenta...' : 'Conectando...'
    : mode === 'signup' ? 'Crear Cuenta en Nuvio' : 'Conectar Cuenta';
  button.innerHTML = `<i class="fa-solid ${icon} mr-1"></i> ${label}`;
}
