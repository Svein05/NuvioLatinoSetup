export function mountTutorialFullscreen({ player, video, button, status }, lifetime) {
  const doc = player.ownerDocument;
  const current = () => doc.fullscreenElement || doc.webkitFullscreenElement;
  const isFull = () => current() === player || video.webkitDisplayingFullscreen === true;
  function synchronize() {
    const full = isFull();
    button.setAttribute('aria-label', full ? 'Salir de pantalla completa' : 'Pantalla completa');
    button.querySelector('i').className = `fa-solid fa-${full ? 'compress' : 'expand'}`;
  }
  lifetime.on(button, 'click', async () => {
    try {
      if (current()) await (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.());
      else if (video.webkitDisplayingFullscreen) video.webkitExitFullscreen();
      else if (player.requestFullscreen && doc.fullscreenEnabled !== false) await player.requestFullscreen();
      else if (player.webkitRequestFullscreen && doc.webkitFullscreenEnabled !== false) player.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else status.textContent = 'La pantalla completa no está disponible en este navegador.';
    } catch {
      status.textContent = 'No se pudo abrir la pantalla completa. Puedes seguir viendo el video aquí.';
    }
  });
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) lifetime.on(doc, event, synchronize);
  for (const event of ['webkitbeginfullscreen', 'webkitendfullscreen']) lifetime.on(video, event, synchronize);
  return () => {
    try {
      if (current() === player) {
        const result = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.();
        result?.catch?.(() => {});
      } else if (video.webkitDisplayingFullscreen) video.webkitExitFullscreen?.();
    } catch { /* Closing must still release the dialog and scroll lock. */ }
  };
}
