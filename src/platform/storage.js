// Persistence that works both on web (localStorage) and under Capacitor
// (@capacitor/preferences), loaded lazily so the web build stays tiny.

const KEY = 'pockethack_profile_v1';
let prefs = null;

async function getPrefs() {
  if (prefs !== null) return prefs;
  try {
    const cap = await import('@capacitor/core');
    if (cap?.Capacitor?.isNativePlatform?.()) {
      prefs = (await import('@capacitor/preferences')).Preferences;
      return prefs;
    }
  } catch { /* web build: fall through */ }
  prefs = false;
  return prefs;
}

export async function saveProfile(profile) {
  const json = JSON.stringify(profile);
  const p = await getPrefs();
  if (p) { await p.set({ key: KEY, value: json }); return; }
  try { localStorage.setItem(KEY, json); } catch { /* private mode */ }
}

export async function loadProfile() {
  const p = await getPrefs();
  try {
    if (p) { const { value } = await p.get({ key: KEY }); return value ? JSON.parse(value) : null; }
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

export async function clearProfile() {
  const p = await getPrefs();
  if (p) { await p.remove({ key: KEY }); return; }
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export async function buzz(style = 'light') {
  try {
    const cap = await import('@capacitor/core');
    if (!cap?.Capacitor?.isNativePlatform?.()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style === 'heavy' ? 'Heavy' : 'Light'] });
  } catch { /* no haptics on web */ }
}
