import './style.css';
import { App } from './ui/app.js';

const root = document.getElementById('app');
const app = new App(root);
app.boot();

// Android hardware back button under Capacitor.
import('@capacitor/app')
  .then(({ App: CapApp }) => {
    CapApp.addListener('backButton', () => {
      if (app.overlay) { app.overlay = null; app.render(); return; }
      if (app.scene === 'device') { app.runCommand('DISCONNECT', { type: 'rig' }); return; }
      if (app.scene === 'net') { app.jackOut(); return; }
      CapApp.exitApp();
    });
  })
  .catch(() => { /* web build */ });
