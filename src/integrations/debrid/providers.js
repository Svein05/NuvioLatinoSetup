const bearer = key => ({ Authorization: `Bearer ${key}` });

export const debridProviders = {
  torbox: {
    request: key => ({ url: 'https://api.torbox.app/v1/api/user/me', headers: bearer(key) }),
    accepted: data => data?.success === true,
    rejected: data => data?.success === false,
    account: data => ({ user: data.data?.email || 'Usuario TorBox',
      plan: data.data?.plan === 0 ? 'Gratis' : `Plan ${data.data?.plan ?? 'Activo'}` }),
  },
  alldebrid: {
    request: key => ({ url: `https://api.alldebrid.com/v4/user?agent=nuvio&apikey=${encodeURIComponent(key)}` }),
    accepted: data => data?.status === 'success',
    rejected: data => data?.status === 'error',
    account: data => ({ user: data.data?.user?.username || 'Usuario AllDebrid',
      plan: data.data?.user?.isPremium ? 'Premium Activo' : 'Cuenta Gratuita (Sin Premium)' }),
  },
  realdebrid: {
    request: key => ({ url: 'https://api.real-debrid.com/rest/1.0/user', headers: bearer(key) }),
    accepted: data => typeof data?.username === 'string' && data.username.length > 0,
    rejected: data => typeof data?.error_code === 'number',
    account: data => ({ user: data.username, plan: data.type === 'premium' ? 'Premium' : 'Gratis' }),
  },
  premiumize: {
    request: key => ({ url: `https://www.premiumize.me/api/account/info?apikey=${encodeURIComponent(key)}` }),
    accepted: data => data?.status === 'success',
    rejected: data => data?.status === 'error',
    account: (data, now) => ({ user: data.customer_id ? `ID: ${data.customer_id}` : 'Usuario Premiumize',
      plan: data.premium_until && data.premium_until > now / 1000 ? 'Premium Activo' : 'Expirado' }),
  },
  debridlink: {
    request: key => ({ url: 'https://debrid-link.com/api/v2/account/profile', headers: bearer(key) }),
    accepted: data => data?.success === true || (data?.success !== false && data?.value !== null && typeof data?.value === 'object'),
    rejected: data => data?.success === false,
    account: data => ({ user: data.value?.pseudo || 'Usuario Debrid-Link', plan: data.value?.premium ? 'Premium' : 'Estándar' }),
  },
};
