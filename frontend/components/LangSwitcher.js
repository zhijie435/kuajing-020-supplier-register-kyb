import { defineComponent, reactive, toRefs } from 'vue';
export default defineComponent({
  name: 'LangSwitcher',
  props: {
    i18n: { type: Object, required: true },
    currentLang: { type: String, required: true },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const options = [
      { value: 'zh-CN', labelKey: 'lang.zh_cn' },
      { value: 'en-US', labelKey: 'lang.en_us' },
      { value: 'ja-JP', labelKey: 'lang.ja_jp' },
    ];
    const onChange = (e) => emit('change', e.target.value);
    return { options, onChange };
  },
  template: `<div class="switcher">
    <label>{{ i18n.t('lang.label') }}</label>
    <select :value="currentLang" @change="onChange">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ i18n.t(o.labelKey) }}</option>
    </select>
  </div>`,
});
