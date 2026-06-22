import { defineComponent, ref, reactive, computed, onMounted, h, markRaw } from 'vue';
import LangSwitcher from './components/LangSwitcher.js';
import CurrencySwitcher from './components/CurrencySwitcher.js';
import CourseCard from './components/CourseCard.js';
import CurrencyConverter from './components/CurrencyConverter.js';
import RatesTable from './components/RatesTable.js';

export default defineComponent({
  name: 'App',
  components: { LangSwitcher, CurrencySwitcher, CourseCard, CurrencyConverter, RatesTable },
  setup() {
    const i18n = window.__i18n__;
    const currency = window.__currency__;
    const currentLang = ref(i18n.getLang());
    const currentCurrency = ref(currency.getCurrency());
    const courses = ref([
      { id: 1, title: 'Vue 3 Mastery', desc: 'Learn Vue 3 Composition API', teacher: 'Alice', price: 299, original_price: 499, students: 1234, rating: 4.8, level: 'beginner', lessons: 24 },
      { id: 2, title: 'Advanced PHP', desc: 'PHP OOP & Design Patterns', teacher: 'Bob', price: 599, original_price: 899, students: 876, rating: 4.9, level: 'intermediate', lessons: 48 },
      { id: 3, title: 'Microservices Architecture', desc: 'Build scalable systems', teacher: 'Carol', price: 1299, original_price: 1999, students: 432, rating: 4.7, level: 'advanced', lessons: 72 },
      { id: 4, title: 'Free Intro to Coding', desc: 'First steps into programming', teacher: 'Dan', price: 0, original_price: 0, students: 5678, rating: 4.6, level: 'beginner', lessons: 12 },
    ]);
    const showFallback = computed(() => currentLang.value === 'ja-JP');
    const fallbackKeys = computed(() => ['common.read_more', 'course.level_beginner', 'course.level_intermediate', 'course.level_advanced', 'demo.fallback_test']);
    const changeLang = (l) => { i18n.setLang(l); currentLang.value = l; };
    const changeCurrency = (c) => { currency.setCurrency(c); currentCurrency.value = c; };
    const refreshRates = () => currency.loadRates();
    const t = (k, p) => i18n.t(k, p);
    const year = new Date().getFullYear();
    return { i18n, currency, currentLang, currentCurrency, courses, showFallback, fallbackKeys, changeLang, changeCurrency, refreshRates, t, year };
  },
  template: `<div class="app">
    <header class="navbar">
      <div class="brand">
        <h1>{{ t('app.title') }}</h1>
        <p class="subtitle">{{ t('app.subtitle') }}</p>
      </div>
      <div class="switchers">
        <LangSwitcher :i18n="i18n" :currentLang="currentLang" @change="changeLang" />
        <CurrencySwitcher :i18n="i18n" :currentCurrency="currentCurrency" @change="changeCurrency" />
        <button class="btn-refresh" @click="refreshRates">{{ t('common.refresh') }}</button>
      </div>
    </header>

    <main class="container">
      <section class="panel">
        <h2>{{ t('demo.title') }}</h2>
        <ul>
          <li>{{ t('demo.desc_1') }}</li>
          <li>{{ t('demo.desc_2') }}</li>
          <li>{{ t('demo.desc_3') }}</li>
        </ul>
      </section>

      <div class="grid-2">
        <section class="panel">
          <h3>{{ t('demo.currency_convert') }}</h3>
          <CurrencyConverter :currency="currency" :i18n="i18n" />
        </section>
        <section class="panel">
          <h3>{{ t('demo.exchange_rates') }}</h3>
          <RatesTable :currency="currency" :baseCurrency="currency.getBaseCurrency()" />
        </section>
      </div>

      <section v-if="showFallback" class="panel fallback-demo">
        <h3>{{ t('demo.notes') }} {{ t('demo.fallback_test') }}</h3>
        <ul>
          <li v-for="k in fallbackKeys" :key="k">
            <code>{{ k }}</code> → <span v-html="t(k)"></span>
            <span v-if="i18n.getFallbackSource(k)" class="fb-tag">[SOURCE: {{ i18n.getFallbackSource(k) }}]</span>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h3>{{ t('demo.all_courses') }}</h3>
        <div class="course-grid">
          <CourseCard v-for="c in courses" :key="c.id" :course="c" :i18n="i18n" :currency="currency" />
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>{{ t('common.copyright', { year }) }}</p>
    </footer>
  </div>`,
});
