export function openRenameCatalogModal({
  currentTitle,
  onSave,
  doc = document,
}) {
  const existing = doc.getElementById('renameCatalogModal');
  if (existing) existing.remove();

  const renameEl = doc.createElement('div');
  renameEl.id = 'renameCatalogModal';
  renameEl.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#08090c]/85 backdrop-blur-xl';
  renameEl.innerHTML = `
    <div class="bg-[#0b0d12]/95 border border-white/10 rounded-3xl max-w-md w-full p-5 shadow-[var(--shadow-lift)] backdrop-blur-[34px] text-white/90 space-y-4">
      <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-pen-to-square text-[#ffd479]"></i>
          <span>Renombrar Catálogo</span>
        </h3>
        <button type="button" onclick="document.getElementById('renameCatalogModal').remove()" class="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
      <div>
        <label class="block text-xs text-white/70 mb-1 font-medium">Nombre visible en Nuvio y AIOMetadata:</label>
        <input id="renameCatalogInput" type="text" value="${currentTitle.replace(/"/g, '&quot;')}" class="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-[#ffd479] text-sm text-white font-medium">
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
        <button type="button" onclick="document.getElementById('renameCatalogModal').remove()" class="lat-capsule-btn glass text-xs py-1.5 px-3.5">
          Cancelar
        </button>
        <button id="btnSaveCatalogRename" type="button" class="lat-capsule-btn solid text-xs py-1.5 px-4">
          Guardar Nombre
        </button>
      </div>
    </div>
  `;

  doc.body.appendChild(renameEl);
  const input = doc.getElementById('renameCatalogInput');
  input?.focus();
  input?.select();

  const saveAction = () => {
    const val = input?.value.trim();
    if (val) {
      onSave(val);
      renameEl.remove();
    }
  };

  const saveBtn = doc.getElementById('btnSaveCatalogRename');
  if (saveBtn) saveBtn.onclick = saveAction;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === 'Enter') saveAction();
      if (e.key === 'Escape') renameEl.remove();
    };
  }
}
