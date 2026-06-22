import { defineComponent, computed } from 'vue';
export default defineComponent({
  name: 'CourseCard',
  props: {
    course: { type: Object, required: true },
    i18n: { type: Object, required: true },
    currency: { type: Object, required: true },
  },
  setup(props) {
    const levelKey = computed(() => 'course.level_' + (props.course.level || 'beginner'));
    const priceStr = computed(() => props.course.price > 0
      ? props.currency.format(props.course.price, props.currency.getCurrency(), props.i18n.getLang())
      : props.i18n.t('course.free'));
    const originalStr = computed(() => props.course.original_price > 0 && props.course.original_price !== props.course.price
      ? props.currency.format(props.course.original_price, props.currency.getCurrency(), props.i18n.getLang())
      : '');
    const lessonsLabel = computed(() => props.i18n.t('course.lessons_count', { count: props.course.lessons || 0 }));
    return { levelKey, priceStr, originalStr, lessonsLabel };
  },
  template: `<div class="course-card">
    <div class="course-badge">{{ i18n.t(levelKey) }}</div>
    <h3 class="course-title">{{ course.title }}</h3>
    <p class="course-desc">{{ course.desc }}</p>
    <div class="course-meta">
      <span>{{ i18n.t('course.teacher') }}: {{ course.teacher }}</span>
      <span>{{ lessonsLabel }}</span>
    </div>
    <div class="course-meta">
      <span>{{ i18n.t('course.students') }}: {{ course.students }}</span>
      <span>{{ i18n.t('course.rating') }}: {{ course.rating }}</span>
    </div>
    <div class="course-price-row">
      <span class="course-price">{{ priceStr }}</span>
      <span v-if="originalStr" class="course-original-price">{{ originalStr }}</span>
    </div>
    <button class="btn-enroll">{{ i18n.t('course.enroll') }}</button>
  </div>`,
});
