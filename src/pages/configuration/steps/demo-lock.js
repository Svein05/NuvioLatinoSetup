import { isDemoSetup, DEMO_LOCK_MESSAGE } from '../../../shared/demo/setup.js';

const controls = '#step-7 button[id^="btnCopy"], #step-7 button[id^="btnDownload"]';

export function renderDemoLock(root, state) {
  const locked = isDemoSetup(state);
  const note = root.querySelector('#setupDemoNotice');
  if (note) note.hidden = !locked;
  root.querySelectorAll(controls).forEach(button => {
    button.disabled = locked;
    button.title = locked ? DEMO_LOCK_MESSAGE : 'Exportar configuración';
    button.classList.toggle('opacity-40', locked);
  });
  const execute = root.querySelector('#btnExecutePipeline');
  if (!execute) return;
  if (locked) {
    execute.classList.remove('hidden'); execute.style.display = 'flex';
    execute.disabled = true;
    execute.title = DEMO_LOCK_MESSAGE;
    execute.innerHTML = '<i class="fa-solid fa-lock" aria-hidden="true"></i><span>Configuración bloqueada · Demostración</span>';
  } else if (execute.textContent?.includes('Demostración')) {
    execute.innerHTML = '<i class="fa-solid fa-bolt" aria-hidden="true"></i><span>Ejecutar configuración automática</span>';
  }
}
