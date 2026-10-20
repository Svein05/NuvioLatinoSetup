import {
  checkAvatarFilenameCollision,
  filterAvatars,
  prepareModderBatch,
  createStagedState,
  undoLastStagedAction,
  discardStagedItem,
} from '../../features/avatars/index.js';
import { showModderToast } from './ui/modder-toast.js';
import { updateStagedToolbar } from './ui/staged-toolbar.js';
import { renderQueueView } from './ui/queue-view.js';
import { renderCollectionsGrid } from './ui/collections-grid.js';
import { renderStyleFilterButtons, renderCollectionAvatars } from './ui/collection-detail-view.js';
import { openEditModal } from './ui/edit-modal.js';
import { releasePreviewUrl } from '../../shared/media/image-converter.js';

function buildCollectionsSummary(list) {
  const groups = new Map();
  for (const av of list) {
    if (!groups.has(av.franchise)) {
      groups.set(av.franchise, { id: av.franchise, franchise: av.franchise, franchiseName: av.franchiseName || av.franchise, avatars: [], stylesMap: new Map() });
    }
    const g = groups.get(av.franchise);
    g.avatars.push(av);
    g.stylesMap.set(av.style, (g.stylesMap.get(av.style) || 0) + 1);
  }
  const order = ['NetflixStyle', 'IconsStyle', 'MangaStyle'];
  return Array.from(groups.values()).map(c => ({
    ...c,
    availableStyles: Array.from(c.stylesMap.entries()).map(([id, count]) => ({ id, name: id, count }))
      .sort((a, b) => (order.indexOf(a.id) !== -1 ? order.indexOf(a.id) : 99) - (order.indexOf(b.id) !== -1 ? order.indexOf(b.id) : 99)),
  })).sort((a, b) => a.franchiseName.localeCompare(b.franchiseName, 'es', { sensitivity: 'base' }));
}

function renderCatalogView({ modderState, stagedState, actions, onSelectAvatar, onRestoreAvatar, onRender }) {
  if (modderState.activeCollection) {
    const refreshed = buildCollectionsSummary(actions.getAvatars()).find(group => group.id === modderState.activeCollection.id);
    if (refreshed) modderState.activeCollection = refreshed;
    renderStyleFilterButtons({
      collection: modderState.activeCollection,
      activeStyle: modderState.detailActiveStyle,
      onToggleStyle: (styleId) => {
        modderState.detailActiveStyle = modderState.detailActiveStyle === styleId ? null : styleId;
        onRender();
      },
    });
    let avatars = modderState.activeCollection.avatars;
    if (modderState.detailActiveStyle) avatars = avatars.filter(a => a.style === modderState.detailActiveStyle);
    const q = (modderState.detailSearchQuery || '').toLowerCase().trim();
    if (q) avatars = filterAvatars({ query: q }, avatars);
    renderCollectionAvatars({ avatars, overrides: stagedState.avatarOverrides, resolveCdnUrl: actions.resolveCdnUrl, onSelectAvatar, onRestoreAvatar });
  } else {
    renderCollectionsGrid({
      collections: buildCollectionsSummary(filterAvatars(modderState.catalogFilters, actions.getAvatars())),
      overrides: stagedState.avatarOverrides,
      resolveCdnUrl: actions.resolveCdnUrl,
      onSelectCollection: (col) => {
        modderState.activeCollection = col;
        document.getElementById('collectionsViewContainer')?.classList.add('hidden');
        document.getElementById('collectionDetailContainer')?.classList.remove('hidden');
        const titleEl = document.getElementById('detailCollectionTitle');
        if (titleEl) titleEl.textContent = col.franchiseName;
        onRender();
      },
    });
  }
}

function openEditForAvatar({ modderState, stagedState, actions, avatar }) {
  modderState.selectedAvatarForEdit = avatar;
  modderState.editReplacementWebp = null;
  openEditModal({
    avatar,
    currentOverride: stagedState.avatarOverrides.get(avatar.id),
    resolveCdnUrl: actions.resolveCdnUrl,
    checkCollision: (target) => checkAvatarFilenameCollision({
      style: avatar.style,
      franchise: avatar.franchise,
      targetFilename: target,
      excludeAvatarId: avatar.id,
      allAvatars: actions.getAvatars(),
      history: stagedState.history,
      overrides: stagedState.avatarOverrides,
    }),
  });
}

function createInitialModderState(session) {
  return {
    token: session?.token || null,
    email: session?.email || '',
    activeTab: 'upload',
    selectedStyle: '',
    selectedFranchise: '',
    isNewFranchise: false,
    filesQueue: [],
    catalogFilters: { style: 'all', franchise: 'all', query: '' },
    activeCollection: null,
    detailActiveStyle: null,
    detailSearchQuery: '',
    selectedAvatarForEdit: null,
    editReplacementWebp: null,
  };
}

function renderModderQueue({ modderState, stagedState, actions, updateToolbar }) {
  const getStyle = () => modderState.selectedStyle;
  const getFranchise = () => modderState.isNewFranchise
    ? document.getElementById('inputNewFranchise')?.value.trim() || ''
    : modderState.selectedFranchise;

  renderQueueView({
    queue: modderState.filesQueue,
    currentStyle: getStyle(),
    currentFranchise: getFranchise(),
    checkCollision: (filename) => checkAvatarFilenameCollision({
      style: getStyle(), franchise: getFranchise(), targetFilename: filename,
      allAvatars: actions.getAvatars(), history: stagedState.history, overrides: stagedState.avatarOverrides,
    }),
    onNameChange: (idx, val) => {
      if (modderState.filesQueue[idx]) modderState.filesQueue[idx].characterName = val.trim().replace(/\.webp$/i, '');
      const button = document.getElementById('btnSubmitBatch');
      try {
        prepareModderBatch({ queue: modderState.filesQueue, style: getStyle(), franchise: getFranchise(),
          allAvatars: actions.getAvatars(), history: stagedState.history, overrides: stagedState.avatarOverrides });
        if (button) button.disabled = false;
      } catch { if (button) button.disabled = true; }
    },
    onRemoveItem: (idx) => {
      releasePreviewUrl(modderState.filesQueue[idx]?.previewUrl);
      modderState.filesQueue.splice(idx, 1);
      renderModderQueue({ modderState, stagedState, actions, updateToolbar });
      updateToolbar();
    },
    onCommitRender: () => renderModderQueue({ modderState, stagedState, actions, updateToolbar }),
  });
}

function releaseStagedPreviews(stagedState) {
  stagedState.history.forEach(action => action.files?.forEach(file => releasePreviewUrl(file.previewUrl)));
  stagedState.history = [];
  stagedState.avatarOverrides.clear();
}

export function createModderController(actions) {
  const modderState = createInitialModderState(actions.session);
  const stagedState = createStagedState();

  const updateToolbar = () => updateStagedToolbar(stagedState, modderState.filesQueue.length);
  const renderCatalog = () => renderCatalogView({
    modderState, stagedState, actions,
    onSelectAvatar: (av) => openEditForAvatar({ modderState, stagedState, actions, avatar: av }),
    onRestoreAvatar: (av) => {
      stagedState.avatarOverrides.delete(av.id);
      stagedState.history.push({ type: 'RESTORE_AVATAR', id: `restore_${Date.now()}`, avatarId: av.id, avatar: av });
      updateToolbar();
      renderCatalog();
      showModderToast(`✓ Se canceló la eliminación de "${av.fileName}".`, 'info');
    },
    onRender: () => renderCatalog(),
  });

  return {
    modderState, stagedState, updateToolbar, renderCatalog, getAvatars: actions.getAvatars,
    clearStaged: () => releaseStagedPreviews(stagedState),
    dispose: () => {
      modderState.filesQueue.forEach(item => releasePreviewUrl(item.previewUrl));
      releasePreviewUrl(modderState.editReplacementWebp?.previewUrl); releaseStagedPreviews(stagedState);
    },
    renderQueue: () => renderModderQueue({ modderState, stagedState, actions, updateToolbar }),
    closeDetail: () => {
      modderState.activeCollection = null;
      document.getElementById('collectionsViewContainer')?.classList.remove('hidden');
      document.getElementById('collectionDetailContainer')?.classList.add('hidden');
      renderCatalog();
    },
    undo: () => {
      const res = undoLastStagedAction(stagedState);
      res?.lastAction.files?.forEach(file => releasePreviewUrl(file.previewUrl));
      if (res) { updateToolbar(); renderCatalog(); showModderToast(res.message, 'info'); }
    },
    discardItem: (key) => {
      const res = discardStagedItem(stagedState, key);
      releasePreviewUrl(res?.removed?.previewUrl);
      if (res) { updateToolbar(); renderCatalog(); showModderToast('Cambio descartado.', 'info'); }
    },
  };
}
