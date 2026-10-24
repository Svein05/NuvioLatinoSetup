export function savePosterWall(root, storage) {
  const tracks = [...root.querySelectorAll('.poster-wall-track')];
  if (tracks.length !== 2 || !root.classList.contains('is-ready')) return;
  const rows = tracks.map(track => {
    const duration = parseFloat(track.style.getPropertyValue('--poster-step')) * 1000;
    const time = Number(track.getAnimations()[0]?.currentTime || 0) - parseFloat(track.style.animationDelay || '0s') * 1000;
    return { sources: [...track.querySelectorAll('img')].map(image => image.src),
      phase: duration ? (time % duration) / duration : 0 };
  });
  try { storage.setItem('nuvio_poster_view_v1', JSON.stringify({ rows, at: Date.now(),
    width: window.innerWidth, height: root.clientHeight, stamp: root.dataset.posterStamp })); }
  catch { /* Navigation remains available when storage is blocked. */ }
}
