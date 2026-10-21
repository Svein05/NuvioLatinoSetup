export async function saveAccountAvatar({ state, config, client, avatarService, ui = {} }) {
  if (!state.dirty?.avatar || !state.selectedAvatarUrl) return;

  const profId = state.selectedProfileId;
  const avatarUrlToSave = avatarService?.resolvePublicUrl
    ? avatarService.resolvePublicUrl(state.selectedAvatarUrl)
    : state.selectedAvatarUrl;

  await client.updateProfileAvatar({
    apiUrl: config?.NUVIO_API_URL,
    apikey: config?.NUVIO_PUBLIC_ANON_KEY,
    accessToken: state.session?.accessToken,
    userId: state.session?.userId,
    profileId: profId,
    avatarUrl: avatarUrlToSave,
  });

  if (avatarService?.recordUsage) {
    void avatarService.recordUsage(state.selectedAvatarUrl, { accessToken: state.session?.accessToken });
  }

  const targetProf = (state.profiles || []).find(p => Number(p.profile_index ?? p.id) === Number(profId));
  if (targetProf) {
    targetProf.avatar_url = avatarUrlToSave;
  }
  state.originalAvatarUrl = state.selectedAvatarUrl;
  state.dirty.avatar = false;

  ui.updateAvatarUI?.(avatarUrlToSave);
}
