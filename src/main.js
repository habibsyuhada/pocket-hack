import './style.css';
import { App } from './ui/app.js';

const root = document.getElementById('app');
const app = new App(root);
app.boot();

// Android hardware back button support under Capacitor.
import('@capacitor/app')
  .then(({ App: CapApp }) => {
    CapApp.addListener('backButton', () => {
      if (app.overlay) { app.overlay = null; app.render(); return; }
      if (app.view === 'play') { app.go('contracts'); return; }
      if (app.view === 'contracts' || app.view === 'archive') { app.go('menu'); return; }
      CapApp.exitApp();
    });
  })
  .catch(() => { /* web build */ });
