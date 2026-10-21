
export function bindTabs(controller) {
  const tabUpload = document.getElementById('tabBtnUpload');
  const tabManage = document.getElementById('tabBtnManage');
  const secUpload = document.getElementById('sectionUpload');
  const secManage = document.getElementById('sectionManage');

  const switchTab = (tab) => {
    controller.modderState.activeTab = tab;
    const isUpload = tab === 'upload';
    tabUpload?.classList.toggle('bg-white/[0.12]', isUpload);
    tabUpload?.classList.toggle('text-white', isUpload);
    tabUpload?.classList.toggle('text-white/60', !isUpload);
    tabManage?.classList.toggle('bg-white/[0.12]', !isUpload);
    tabManage?.classList.toggle('text-white', !isUpload);
    tabManage?.classList.toggle('text-white/60', isUpload);
    secUpload?.classList.toggle('hidden', !isUpload);
    secManage?.classList.toggle('hidden', isUpload);
    if (!isUpload) controller.renderCatalog();
  };

  tabUpload?.addEventListener('click', () => switchTab('upload'));
  tabManage?.addEventListener('click', () => switchTab('manage'));
}
