export function showLandingView(root = document, updateHash = true) {
  const landing = root.querySelector?.('#landingView');
  const wizard = root.querySelector?.('#wizardView');
  if (!landing && wizard) {
    if (typeof window !== 'undefined') window.location.href = '../';
    return;
  }
  const btnText = root.querySelector?.('#btnToggleWizardHeaderText');
  const btnIcon = root.querySelector?.('#btnToggleWizardHeader i');
  if (landing && wizard) {
    landing.classList.remove('hidden');
    wizard.classList.add('hidden');
    if (btnText) btnText.innerText = 'Iniciar Asistente';
    if (btnIcon) btnIcon.className = 'fa-solid fa-wand-magic-sparkles text-[11px]';
    if (updateHash && typeof window !== 'undefined' && window.location.hash) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function showWizardView(root = document, updateHash = true, onShow) {
  const landing = root.querySelector?.('#landingView');
  const wizard = root.querySelector?.('#wizardView');
  if (!landing && wizard) {
    wizard.classList.remove('hidden');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    onShow?.();
    return;
  }
  const btnText = root.querySelector?.('#btnToggleWizardHeaderText');
  const btnIcon = root.querySelector?.('#btnToggleWizardHeader i');
  if (landing && wizard) {
    landing.classList.add('hidden');
    wizard.classList.remove('hidden');
    if (btnText) btnText.innerText = 'Ver Presentación';
    if (btnIcon) btnIcon.className = 'fa-solid fa-house text-[11px]';
    if (updateHash && typeof window !== 'undefined') {
      window.location.hash = '#wizard';
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    onShow?.();
  }
}

export function toggleView(root = document, onShow) {
  const landing = root.querySelector?.('#landingView');
  if (!landing) {
    if (typeof window !== 'undefined') window.location.href = '../';
    return;
  }
  if (!landing.classList.contains('hidden')) {
    showWizardView(root, true, onShow);
  } else {
    showLandingView(root, true);
  }
}
