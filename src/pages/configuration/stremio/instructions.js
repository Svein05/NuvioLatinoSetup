import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';

export function mountStremioInstructions({ root, lifetime, opener }) {
  const modal = root.createElement('div');
  modal.className = 'popup-overlay fixed inset-0 z-[110] hidden items-center justify-center p-4';
  modal.id = 'stremioDeviceInstructions';
  modal.innerHTML = `<section class="popup-panel max-w-xl w-full p-5 sm:p-6 overflow-y-auto space-y-4">
    <header class="flex justify-between gap-3 items-center border-b border-white/10 pb-3"><h2 class="popup-title !border-0 !pb-0" tabindex="-1">Termina de personalizar Stremio</h2><button type="button" data-close aria-label="Cerrar" class="w-8 h-8 rounded-lg text-white/60"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
    <div class="space-y-4 text-sm text-white/70">
      <section class="space-y-2"><h3>Web y escritorio</h3><p>Abre Ajustes y elige español en el idioma de la interfaz. En las opciones del reproductor, configura el idioma preferido de audio y subtítulos. Español latino está disponible en las versiones recientes de Web y escritorio.</p></section>
      <section class="space-y-2"><h3>Android y Android TV</h3><p>En Ajustes de Stremio, revisa el idioma de interfaz y las preferencias del reproductor. El nombre y la disponibilidad de cada opción dependen de tu versión. En TV, sincroniza los addons si todavía no aparecen.</p></section>
      <section class="space-y-2"><h3>iPhone, iPad y otras TV</h3><p>Revisa los ajustes que ofrece tu cliente. Si utilizas Stremio Web o un reproductor externo, el idioma de audio y subtítulos puede configurarse en ese reproductor.</p></section>
      <section class="space-y-2"><h3>Seguimiento de Trakt</h3><p>Vincula Trakt desde las opciones de cuenta o integraciones oficiales de Stremio y comprueba una reproducción en tu dispositivo. Esta autorización es independiente de las listas conectadas a AIOMetadata.</p></section>
      <p class="text-xs text-white/50">El asistente instala addons; no cambia los ajustes locales del reproductor ni confirma el seguimiento en dispositivos que no se hayan probado.</p>
    </div>
  </section>`;
  root.body.append(modal);
  lifetime.add(manageDialog(modal));
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.on(opener, 'click', () => { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.querySelector('h2').focus({ preventScroll: true }); });
  lifetime.on(modal.querySelector('[data-close]'), 'click', close);
  lifetime.on(modal, 'click', event => { if (event.target === modal) close(); });
  lifetime.add(() => modal.remove());
}
