import { createApp } from 'vue';
import { Quasar, Dialog } from 'quasar';
import 'quasar/src/css/index.sass';
import '@quasar/extras/material-icons/material-icons.css';
import './styles/app.css';
import App from './App.vue';

createApp(App)
  .use(Quasar, {
    plugins: { Dialog }
  })
  .mount('#app');
