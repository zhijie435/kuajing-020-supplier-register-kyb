(function (global) {
  let i18n = null;
  let currency = null;
  let version = 0;
  let storeInitialized = false;

  const SAMPLE_COURSES = [
    {
      id: 1,
      nameKey: 'course.name',
      nameZh: 'Python 编程入门',
      nameEn: 'Python Programming Basics',
      descZh: '从零开始学习 Python 编程语言，适合零基础学员。',
      descEn: 'Learn Python programming from scratch, suitable for beginners.',
      category: '编程开发',
      level: 'beginner',
      durationHours: 40,
      priceCny: 299.0,
      originalPriceCny: 499.0,
      teacher: '张老师',
      cover: '/static/images/course1.jpg',
      tags: ['Python', '入门', '编程'],
    },
    {
      id: 2,
      nameKey: 'course.name',
      nameZh: '前端全栈开发实战',
      nameEn: 'Full Stack Frontend Development',
      descZh: 'HTML/CSS/JavaScript + React + Node.js 全栈开发课程。',
      descEn: 'HTML/CSS/JavaScript + React + Node.js full stack development course.',
      category: '前端开发',
      level: 'intermediate',
      durationHours: 80,
      priceCny: 899.0,
      originalPriceCny: 1299.0,
      teacher: '李老师',
      cover: '/static/images/course2.jpg',
      tags: ['React', '全栈', 'Node.js'],
    },
    {
      id: 3,
      nameKey: 'course.name',
      nameZh: '数据结构与算法进阶',
      nameEn: 'Advanced Data Structures and Algorithms',
      descZh: '深入学习高级数据结构和算法，应对技术面试和编程挑战。',
      descEn: 'Deep dive into advanced data structures and algorithms for interviews and challenges.',
      category: '计算机基础',
      level: 'advanced',
      durationHours: 60,
      priceCny: 599.0,
      originalPriceCny: 799.0,
      teacher: '王老师',
      cover: '/static/images/course3.jpg',
      tags: ['算法', '数据结构', '面试'],
    },
    {
      id: 4,
      nameKey: 'course.name',
      nameZh: '机器学习入门到精通',
      nameEn: 'Machine Learning Masterclass',
      descZh: '从基础理论到实战项目，系统学习机器学习。',
      descEn: 'Systematic learning of machine learning from theory to projects.',
      category: '人工智能',
      level: 'advanced',
      durationHours: 100,
      priceCny: 1999.0,
      originalPriceCny: 2599.0,
      teacher: '陈老师',
      cover: '/static/images/course4.jpg',
      tags: ['ML', 'AI', '深度学习'],
    },
  ];

  function bumpVersion() {
    version++;
    if (typeof global.STORE_VERSION_CALLBACK === 'function') {
      global.STORE_VERSION_CALLBACK(version);
    }
  }

  function ensureInitialized() {
    if (!storeInitialized) {
      init();
    }
  }

  function init() {
    if (!global.useI18n || !global.useCurrency) {
      return { success: false, error: 'Dependencies not loaded: useI18n or useCurrency missing' };
    }
    i18n = global.useI18n();
    currency = global.useCurrency();
    i18n.init();
    currency.init();
    storeInitialized = true;
    bumpVersion();
    return { success: true };
  }

  function isInitialized() {
    return storeInitialized;
  }

  function getI18n() {
    ensureInitialized();
    return i18n;
  }

  function getCurrency() {
    ensureInitialized();
    return currency;
  }

  function getCurrentLanguage() {
    ensureInitialized();
    return i18n.getLang();
  }

  function getCurrentCurrency() {
    ensureInitialized();
    return currency.getCurrency();
  }

  function changeLanguage(lang) {
    ensureInitialized();
    const result = i18n.setLang(lang);
    if (result.success && result.changed) {
      bumpVersion();
    }
    return result;
  }

  function changeCurrency(cur) {
    ensureInitialized();
    const result = currency.setCurrency(cur);
    if (result.success && result.changed) {
      bumpVersion();
    }
    return result;
  }

  function t(key, params) {
    ensureInitialized();
    return i18n.t(key, params);
  }

  function convertPrice(amountCny, targetCurrency) {
    ensureInitialized();
    const result = currency.convert(amountCny, 'CNY', targetCurrency || currency.getCurrency());
    return result;
  }

  function formatPrice(amountCny, targetCurrency) {
    ensureInitialized();
    return currency.format(amountCny, targetCurrency);
  }

  function getCoursesWithFormattedPrices(options) {
    ensureInitialized();
    const opts = options || {};
    const targetCurrency = opts.currency || currency.getCurrency();
    const lang = opts.language || i18n.getLang();
    const isEn = lang === 'en-US';
    const isJa = lang === 'ja-JP';

    return SAMPLE_COURSES.map(function (c) {
      const priceFormatted = currency.format(c.priceCny, targetCurrency);
      const originalFormatted = currency.format(c.originalPriceCny, targetCurrency);
      const priceConverted = currency.convert(c.priceCny, 'CNY', targetCurrency);
      const originalConverted = currency.convert(c.originalPriceCny, 'CNY', targetCurrency);

      let courseName;
      let courseDesc;
      if (isEn) {
        courseName = c.nameEn;
        courseDesc = c.descEn;
      } else {
        courseName = c.nameZh;
        courseDesc = c.descZh;
      }

      return {
        id: c.id,
        name: courseName,
        description: courseDesc,
        category: c.category,
        level: i18n.t('course.' + c.level),
        durationHours: c.durationHours,
        teacher: c.teacher,
        cover: c.cover,
        tags: c.tags,
        originalPriceCny: c.originalPriceCny,
        priceCny: c.priceCny,
        originalPriceConverted: originalConverted.success ? originalConverted.result : c.originalPriceCny,
        priceConverted: priceConverted.success ? priceConverted.result : c.priceCny,
        originalPriceFormatted: originalFormatted.formatted,
        priceFormatted: priceFormatted.formatted,
        priceNoSymbolFormatted: priceFormatted.formattedNoSymbol,
        currency: targetCurrency,
        language: lang,
      };
    });
  }

  function getDashboardStats() {
    ensureInitialized();
    const lang = i18n.getLang();
    const curr = currency.getCurrency();
    const revenue = 1234567.89;
    const revenueFormatted = currency.format(revenue, curr);
    return {
      totalStudents: 15280,
      totalCourses: 128,
      totalOrders: 9876,
      totalRevenue: revenue,
      totalRevenueFormatted: revenueFormatted.formatted,
      todayNewStudents: 86,
      completionRate: 0.78,
      activeCourses: 64,
      currency: curr,
      language: lang,
    };
  }

  function syncSystem() {
    ensureInitialized();
    return Promise.all([
      currency.syncLiveRates(),
      Promise.resolve({ success: true }),
    ]).then(function (results) {
      return {
        success: true,
        rateSync: results[0],
        i18nSync: results[1],
      };
    });
  }

  function getVersion() {
    const i18nV = i18n ? i18n.getVersion() : 0;
    const curV = currency ? currency.getVersion() : 0;
    return {
      store: version,
      i18n: i18nV,
      currency: curV,
      combined: 's' + version + '-i' + i18nV + '-c' + curV,
    };
  }

  function resetAllStore() {
    if (i18n) i18n.resetAllState();
    if (currency) currency.resetAllState();
    bumpVersion();
  }

  function getSampleCourses() {
    return JSON.parse(JSON.stringify(SAMPLE_COURSES));
  }

  global.useStore = function () {
    return {
      init: init,
      isInitialized: isInitialized,
      getI18n: getI18n,
      getCurrency: getCurrency,
      getCurrentLanguage: getCurrentLanguage,
      getCurrentCurrency: getCurrentCurrency,
      changeLanguage: changeLanguage,
      changeCurrency: changeCurrency,
      t: t,
      convertPrice: convertPrice,
      formatPrice: formatPrice,
      getCoursesWithFormattedPrices: getCoursesWithFormattedPrices,
      getDashboardStats: getDashboardStats,
      syncSystem: syncSystem,
      getVersion: getVersion,
      resetAllStore: resetAllStore,
      getSampleCourses: getSampleCourses,
    };
  };
})(window);
