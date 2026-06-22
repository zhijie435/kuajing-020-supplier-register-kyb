import { defineComponent, ref, computed, watch } from 'vue';
export default defineComponent({
  name: 'CurrencyConverter',
  props: {
    currency: { type: Object, required: true },
    i18n: { type: Object, required: true },
  },
  setup(props) {
    const amount = ref(100);
    const from = ref('CNY');
    const to = ref('USD');
    const currencies = props.currency.getSupportedCurrencies();
    const converted = computed(() => props.currency.convert(amount.value, from.value, to.value));
    const convertedStr = computed(() => props.currency.format(converted.value, to.value, props.i18n.getLang()));
    const fromStr = computed(() => props.currency.format(amount.value, from.value, props.i18n.getLang()));
    return { amount, from, to, currencies, converted, convertedStr, fromStr };
  },
  template: `<div class="converter">
    <div class="conv-row">
      <div>
        <label>{{ i18n.t('demo.base_currency') }}</label>
        <select v-model="from">
          <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label>{{ i18n.t('demo.target_currency') }}</label>
        <select v-model="to">
          <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>
    <div class="conv-row">
      <div>
        <label>{{ i18n.t('demo.original_amount') }}</label>
        <input type="number" v-model.number="amount" min="0" step="0.01">
      </div>
      <div>
        <label>{{ i18n.t('demo.converted_amount') }}</label>
        <div class="conv-result">{{ convertedStr }} <small>({{ fromStr }})</small></div>
      </div>
    </div>
  </div>`,
});
