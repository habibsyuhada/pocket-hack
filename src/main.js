import './style.css';
import './fx/fx.css';
import './fx/screens.css';
import { fx } from './fx/index.js';
import { LANG } from './i18n/index.js';
document.documentElement.lang = LANG;
import { App } from './ui/app.js';

const root = document.getElementById('app');
const app = new App(root);
fx.init();
app.boot();

// Escape on desktop, hardware back button under Capacitor (Android).
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') app.back(); });
import('@capacitor/app')
  .then(({ App: CapApp }) => {
    CapApp.addListener('backButton', () => { if (!app.back()) CapApp.exitApp(); });
  })
  .catch(() => { /* web build */ });
