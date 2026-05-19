import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import '@fontsource/montserrat/index.css';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import ToastService from 'primevue/toastservice';

const app = createApp(App);
const pinia = createPinia();

// PrimeVue UI Library Plugin
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});
app.use(ToastService);
app.use(pinia);
app.use(router);
app.mount('#app');
