import { defineComponent } from 'vue';
export default defineComponent({
  name: 'CurrencySwitcher',
  props: {
    i18n: { type: Object, required: true },
    currentCurrency: { type: String, required: true },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const options = [
      { value: 'CNY', labelKey: 'currency.cny' },
      { value: 'USD', labelKey: 'currency.usd' },
      { value: 'JPY', labelKey: 'currency.jpy' },
      { value: 'EUR', labelKey: 'currency.eur' },
      { value: 'HKD', labelKey: 'currency.hkd' },
    ];
    const onChange = (e) => emit('change', e.target.value);
    return { options, onChange };
  },
  template: `<div class="switcher">
    <label>{{ i18n.t('currency.label') }}</label>
    <select :value="currentCurrency" @change="onChange">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.value }} - {{ i18n.t(o.labelKey) }}</option>
    </select>
  </div>`,
});
