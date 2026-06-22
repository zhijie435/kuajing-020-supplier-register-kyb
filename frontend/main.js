import { createApp } from 'vue';
import { createI18n } from './utils/i18n.js';
import { createCurrency } from './utils/currency.js';
import App from './App.js';

async function bootstrap() {
  const i18n = createI18n();
  const currency = createCurrency();
  await i18n.init();
  await currency.init();
  window.__i18n__ = i18n;
  window.__currency__ = currency;
  const app = createApp(App);
  app.config.globalProperties.$t = i18n.t.bind(i18n);
  app.config.globalProperties.$i18n = i18n;
  app.config.globalProperties.$currency = currency;
  app.mount('#app');
}

bootstrap();
