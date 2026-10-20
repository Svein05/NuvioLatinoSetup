import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniNuvioCore } from '../ui/mini-nuvio-core.js';

describe('MiniNuvioCore', () => {
  let mockState;
  let container;
  let elements;

  beforeEach(() => {
    elements = new Map();
    container = { id: 'testContainer', innerHTML: '', classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() } };
    elements.set('testContainer', container);

    globalThis.document = {
      getElementById: (id) => elements.get(id) || null,
      createElement: (tag) => {
        const el = {
          tag,
          id: '',
          innerHTML: '',
          classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
          appendChild: (c) => elements.set(c.id, c),
          remove: () => elements.delete(el.id),
        };
        return el;
      },
      body: { appendChild: (child) => elements.set(child.id, child) },
      querySelectorAll: () => [],
    };
    globalThis.window = {
      innerWidth: 1200,
      matchMedia: () => ({ matches: false }),
    };

    mockState = {
      collections: [
        {
          id: 'sec-1',
          title: 'Películas',
          enabled: true,
          folders: [
            { id: 'f-1', title: 'Acción', enabled: true, sources: [{ catalogId: 'c-1', title: 'Top' }] },
            { id: 'f-2', title: 'Comedia', enabled: false, sources: [] },
          ],
        },
      ],
      rawMetadataTemplate: { catalogs: [{ id: 'c-1', name: 'Top Películas' }] },
      subscribe: vi.fn((cb) => {
        mockState._cb = cb;
        return vi.fn();
      }),
      toggleFolder: vi.fn(),
      toggleSection: vi.fn(),
      toggleAllCollections: vi.fn(),
      moveFolder: vi.fn(),
      moveSection: vi.fn(),
      moveSectionExtreme: vi.fn(),
      moveCatalogInFolder: vi.fn(() => true),
      moveCatalogExtreme: vi.fn(() => true),
      removeCatalogFromFolder: vi.fn(),
      renameCatalogInFolder: vi.fn(),
      addCatalogToFolder: vi.fn(() => ({ success: true })),
      reorderFolder: vi.fn(),
      reorderSection: vi.fn(),
      updateSection: vi.fn(),
      updateFolder: vi.fn(),
      resetCollections: vi.fn(),
    };
  });

  it('renders loading state when collections are empty', () => {
    const mini = new MiniNuvioCore(container, { state: { collections: [] } });
    mini.render();
    expect(container.innerHTML).toContain('Cargando colecciones nativas de Nuvio');
  });

  it('renders toolbar, hero banner and sections when collections are present', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.init();
    expect(container.innerHTML).toContain('1/2 activas');
    expect(container.innerHTML).toContain('Películas');
    expect(container.innerHTML).toContain('Acción');
    expect(container.innerHTML).toContain('miniNuvioHeroBanner');
  });

  it('updates focused folder on focusFolder', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.init();
    expect(mini.focusedFolder?.id).toBe('f-1');

    mini.focusFolder('sec-1', 'f-2');
    expect(mini.focusedFolder?.id).toBe('f-2');
  });

  it('delegates collection and section actions to state methods', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.toggleFolder('sec-1', 'f-1');
    expect(mockState.toggleFolder).toHaveBeenCalledWith('sec-1', 'f-1');

    mini.toggleSection('sec-1');
    expect(mockState.toggleSection).toHaveBeenCalledWith('sec-1');

    mini.toggleAll(true);
    expect(mockState.toggleAllCollections).toHaveBeenCalledWith(true);

    mini.moveFolder('sec-1', 0, 1);
    expect(mockState.moveFolder).toHaveBeenCalledWith('sec-1', 0, 1);

    mini.moveSection(0, 1);
    expect(mockState.moveSection).toHaveBeenCalledWith(0, 1);

    mini.moveSectionExtreme(0, 'top');
    expect(mockState.moveSectionExtreme).toHaveBeenCalledWith(0, 'top');
  });

  it('opens and closes catalog explorer modal in modal container', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.openCatalogExplorer('sec-1', 'f-1');
    const modal = elements.get('miniNuvioModalsContainer');
    expect(modal).toBeDefined();
    expect(modal.innerHTML).toContain('Top');

    mini.closeModal();
    expect(modal.innerHTML).toBe('');
  });

  it('opens section customization modal', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.openSectionModal('sec-1');
    const modal = elements.get('miniNuvioModalsContainer');
    expect(modal.innerHTML).toContain('Personalizar Sección');

    mini.closeModal();
    expect(modal.innerHTML).toBe('');
  });

  it('opens folder design modal', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.openEditModal('sec-1', 'f-1');
    const modal = elements.get('miniNuvioModalsContainer');
    expect(modal.innerHTML).toContain('Diseño de Fila');

    mini.closeModal();
    expect(modal.innerHTML).toBe('');
  });

  it('rerenders when state emits COLLECTIONS_UPDATED', () => {
    const mini = new MiniNuvioCore(container, { state: mockState });
    mini.init();
    const renderSpy = vi.spyOn(mini, 'render');
    mockState._cb(mockState, 'COLLECTIONS_UPDATED');
    expect(renderSpy).toHaveBeenCalled();
  });
});
