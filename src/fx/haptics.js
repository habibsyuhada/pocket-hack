// Haptics with a few named patterns. Native: @capacitor/haptics (impact / notification /
// selection). Web (Android Chrome etc.): navigator.vibrate. Silent when disabled in settings.
import { settings } from './settings.js';

const WEB = {
  select: 5, light: 10, medium: 18, heavy: 32,
  success: [12, 40, 20], warning: [20, 50, 20], error: [30, 40, 30, 40, 30]
};

let native; // undefined = not probed yet, null = unavailable, else { Haptics, ImpactStyle, NotificationType }
async function probe() {
  if (native !== undefined) return native;
  try {
    const cap = await import('@capacitor/core');
    if (!cap?.Capacitor?.isNativePlatform?.()) return (native = null);
    const h = await import('@capacitor/haptics');
    native = { Haptics: h.Haptics, ImpactStyle: h.ImpactStyle, NotificationType: h.NotificationType };
  } catch { native = null; }
  return native;
}

// kind: select | light | medium | heavy | success | warning | error
export async function haptic(kind = 'light') {
  if (!settings.haptics) return;
  try {
    const n = await probe();
    if (n) {
      if (kind === 'select') return void (await n.Haptics.selectionChanged());
      if (kind === 'success' || kind === 'warning' || kind === 'error') {
        return void (await n.Haptics.notification({ type: n.NotificationType[kind[0].toUpperCase() + kind.slice(1)] }));
      }
      return void (await n.Haptics.impact({ style: n.ImpactStyle[kind === 'heavy' ? 'Heavy' : kind === 'medium' ? 'Medium' : 'Light'] }));
    }
    globalThis.navigator?.vibrate?.(WEB[kind] ?? 10);
  } catch { /* no haptics */ }
}
