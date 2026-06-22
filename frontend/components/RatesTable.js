import { defineComponent, computed } from 'vue';
export default defineComponent({
  name: 'RatesTable',
  props: {
    currency: { type: Object, required: true },
    baseCurrency: { type: String, required: true },
  },
  setup(props) {
    const ratesData = computed(() => {
      const rates = props.currency.getRates();
      const symbol = props.currency.isUsingFallback() ? '⚠ FALLBACK' : '✓ LIVE';
      return Object.keys(rates).map(k => ({ code: k, rate: rates[k], symbol }));
    });
    return { ratesData };
  },
  template: `<table class="rates-table">
    <thead>
      <tr><th>Currency</th><th>Rate (1 {{ baseCurrency }})</th><th>Source</th></tr>
    </thead>
    <tbody>
      <tr v-for="r in ratesData" :key="r.code">
        <td>{{ r.code }}</td><td>{{ r.rate }}</td><td :class="r.symbol.includes('FALLBACK') ? 'fb' : 'ok'">{{ r.symbol }}</td>
      </tr>
    </tbody>
  </table>`,
});
