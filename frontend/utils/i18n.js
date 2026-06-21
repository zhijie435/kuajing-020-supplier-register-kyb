(function (global) {
  const DEFAULT_LANG = 'zh-CN';
  const FALLBACK_LANG = 'en-US';
  const SUPPORTED_LANGS = ['zh-CN', 'en-US', 'ja-JP'];

  const STATUS_PENDING = 'pending';
  const STATUS_APPROVED = 'approved';
  const STATUS_REJECTED = 'rejected';
  const STATUS_WRITTEN = 'written';

  let currentLang = DEFAULT_LANG;
  let localePackages = {};
  let reviewRecords = {};
  let version = 0;

  function bumpVersion() {
    version++;
    if (typeof global.I18N_VERSION_CALLBACK === 'function') {
      global.I18N_VERSION_CALLBACK(version);
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length; i++) {
      if (curr == null) return undefined;
      curr = curr[parts[i]];
    }
    return curr;
  }

  function setByPath(obj, path, value) {
    if (!obj || !path) return;
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') {
        curr[parts[i]] = {};
      }
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
  }

  function formatTemplate(str, params) {
    if (!str || !params) return str;
    return str.replace(/\{(\w+)\}/g, function (match, key) {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  function recordKey(lang, key) {
    return lang + '::' + key;
  }

  function loadLocales() {
    localePackages['zh-CN'] = deepClone(global.LOCALE_ZH_CN || {});
    localePackages['en-US'] = deepClone(global.LOCALE_EN_US || {});
    localePackages['ja-JP'] = deepClone(global.LOCALE_JA_JP || {});
  }

  function ensureReviewRecord(lang, key, fallbackValue) {
    const rk = recordKey(lang, key);
    if (!reviewRecords[rk]) {
      const originalValue = getByPath(localePackages[DEFAULT_LANG], key);
      reviewRecords[rk] = {
        lang: lang,
        key: key,
        original: originalValue !== undefined ? originalValue : key,
        fallback: fallbackValue,
        proposed: fallbackValue,
        status: STATUS_PENDING,
        reviewer: null,
        reviewTime: null,
        writeBackTime: null,
        history: [
          {
            action: 'create',
            status: STATUS_PENDING,
            time: new Date().toISOString(),
          },
        ],
      };
      persistReviewRecords();
      bumpVersion();
    }
    return reviewRecords[rk];
  }

  function persistReviewRecords() {
    try {
      localStorage.setItem('i18n_review_records', JSON.stringify(reviewRecords));
    } catch (e) {}
  }

  function restoreReviewRecords() {
    try {
      const raw = localStorage.getItem('i18n_review_records');
      if (raw) {
        reviewRecords = JSON.parse(raw);
      }
    } catch (e) {
      reviewRecords = {};
    }
  }

  function persistCurrentLang() {
    try {
      localStorage.setItem('i18n_current_lang', currentLang);
    } catch (e) {}
  }

  function restoreCurrentLang() {
    try {
      const lang = localStorage.getItem('i18n_current_lang');
      if (lang && SUPPORTED_LANGS.includes(lang)) {
        currentLang = lang;
      }
    } catch (e) {}
  }

  function init() {
    loadLocales();
    restoreReviewRecords();
    restoreCurrentLang();
    bumpVersion();
  }

  function getLang() {
    return currentLang;
  }

  function getSupportedLangs() {
    return SUPPORTED_LANGS.slice();
  }

  function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      return { success: false, error: 'Unsupported language: ' + lang };
    }
    if (currentLang === lang) {
      return { success: true, changed: false, lang: lang };
    }
    currentLang = lang;
    persistCurrentLang();
    bumpVersion();
    return { success: true, changed: true, lang: lang };
  }

  function t(key, params) {
    const tryLangs = [];
    if (currentLang !== DEFAULT_LANG && currentLang !== FALLBACK_LANG) {
      tryLangs.push(currentLang);
    }
    if (currentLang !== FALLBACK_LANG) {
      tryLangs.push(FALLBACK_LANG);
    }
    tryLangs.push(DEFAULT_LANG);

    let hitLang = null;
    let hitValue = undefined;
    let fallbackUsed = false;

    for (let i = 0; i < tryLangs.length; i++) {
      const lang = tryLangs[i];
      const pkg = localePackages[lang];
      const val = getByPath(pkg, key);
      if (val !== undefined && typeof val === 'string') {
        hitLang = lang;
        hitValue = val;
        if (i > 0) fallbackUsed = true;
        break;
      }
    }

    if (hitValue === undefined) {
      if (currentLang !== DEFAULT_LANG) {
        ensureReviewRecord(currentLang, key, key);
      }
      return formatTemplate(key, params);
    }

    if (fallbackUsed && currentLang !== DEFAULT_LANG && currentLang !== hitLang) {
      ensureReviewRecord(currentLang, key, hitValue);
    }

    return formatTemplate(hitValue, params);
  }

  function getRaw(key, lang) {
    const targetLang = lang || currentLang;
    const pkg = localePackages[targetLang];
    if (!pkg) return undefined;
    return getByPath(pkg, key);
  }

  function getReviewRecord(lang, key) {
    const rk = recordKey(lang, key);
    return reviewRecords[rk] ? deepClone(reviewRecords[rk]) : null;
  }

  function getAllReviewRecords(filter) {
    const list = Object.keys(reviewRecords).map(function (k) {
      return deepClone(reviewRecords[k]);
    });
    if (!filter) return list;
    return list.filter(function (r) {
      if (filter.lang && r.lang !== filter.lang) return false;
      if (filter.status && r.status !== filter.status) return false;
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase();
        if (
          !(r.key || '').toLowerCase().includes(kw) &&
          !(r.proposed || '').toLowerCase().includes(kw) &&
          !(r.original || '').toLowerCase().includes(kw)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  function getReviewStats() {
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      written: 0,
      byLang: {},
    };
    Object.keys(reviewRecords).forEach(function (k) {
      const r = reviewRecords[k];
      stats.total++;
      stats[r.status] = (stats[r.status] || 0) + 1;
      if (!stats.byLang[r.lang]) stats.byLang[r.lang] = { total: 0, pending: 0, approved: 0, rejected: 0, written: 0 };
      stats.byLang[r.lang].total++;
      stats.byLang[r.lang][r.status] = (stats.byLang[r.lang][r.status] || 0) + 1;
    });
    return stats;
  }

  function approveReview(lang, key, reviewer) {
    const rk = recordKey(lang, key);
    const rec = reviewRecords[rk];
    if (!rec) return { success: false, error: 'Record not found' };
    if (rec.status !== STATUS_PENDING && rec.status !== STATUS_REJECTED) {
      return { success: false, error: 'Invalid status transition from ' + rec.status };
    }
    rec.status = STATUS_APPROVED;
    rec.reviewer = reviewer || 'system';
    rec.reviewTime = new Date().toISOString();
    rec.history.push({
      action: 'approve',
      status: STATUS_APPROVED,
      reviewer: rec.reviewer,
      time: rec.reviewTime,
    });
    persistReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function rejectReview(lang, key, reviewer, reason) {
    const rk = recordKey(lang, key);
    const rec = reviewRecords[rk];
    if (!rec) return { success: false, error: 'Record not found' };
    if (rec.status !== STATUS_PENDING) {
      return { success: false, error: 'Invalid status transition from ' + rec.status };
    }
    rec.status = STATUS_REJECTED;
    rec.reviewer = reviewer || 'system';
    rec.reviewTime = new Date().toISOString();
    rec.history.push({
      action: 'reject',
      status: STATUS_REJECTED,
      reviewer: rec.reviewer,
      reason: reason || '',
      time: rec.reviewTime,
    });
    persistReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function writeBackApproved(lang, key) {
    const rk = recordKey(lang, key);
    const rec = reviewRecords[rk];
    if (!rec) return { success: false, error: 'Record not found' };
    if (rec.status !== STATUS_APPROVED) {
      return { success: false, error: 'Can only write back approved records' };
    }
    setByPath(localePackages[lang], key, rec.proposed);
    rec.status = STATUS_WRITTEN;
    rec.writeBackTime = new Date().toISOString();
    rec.history.push({
      action: 'writeBack',
      status: STATUS_WRITTEN,
      time: rec.writeBackTime,
    });
    persistReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function resetReview(lang, key) {
    const rk = recordKey(lang, key);
    const rec = reviewRecords[rk];
    if (!rec) return { success: false, error: 'Record not found' };
    rec.status = STATUS_PENDING;
    rec.reviewer = null;
    rec.reviewTime = null;
    rec.writeBackTime = null;
    rec.proposed = rec.fallback;
    rec.history.push({
      action: 'reset',
      status: STATUS_PENDING,
      time: new Date().toISOString(),
    });
    persistReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function updateProposedValue(lang, key, proposed) {
    const rk = recordKey(lang, key);
    let rec = reviewRecords[rk];
    if (!rec) {
      rec = ensureReviewRecord(lang, key, proposed);
    }
    if (rec.status === STATUS_WRITTEN) {
      rec.status = STATUS_PENDING;
      rec.reviewer = null;
      rec.reviewTime = null;
      rec.writeBackTime = null;
    }
    rec.proposed = proposed;
    rec.history.push({
      action: 'updateProposed',
      from: rec.proposed,
      to: proposed,
      status: rec.status,
      time: new Date().toISOString(),
    });
    persistReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function bulkApproveReviews(filter, reviewer) {
    const list = getAllReviewRecords(filter || { status: STATUS_PENDING });
    let count = 0;
    list.forEach(function (r) {
      const result = approveReview(r.lang, r.key, reviewer);
      if (result.success) count++;
    });
    return { success: true, total: list.length, approved: count };
  }

  function bulkRejectReviews(filter, reviewer, reason) {
    const list = getAllReviewRecords(filter || { status: STATUS_PENDING });
    let count = 0;
    list.forEach(function (r) {
      const result = rejectReview(r.lang, r.key, reviewer, reason);
      if (result.success) count++;
    });
    return { success: true, total: list.length, rejected: count };
  }

  function bulkWriteBackApproved(filter) {
    const list = getAllReviewRecords(filter || { status: STATUS_APPROVED });
    let count = 0;
    list.forEach(function (r) {
      const result = writeBackApproved(r.lang, r.key);
      if (result.success) count++;
    });
    return { success: true, total: list.length, written: count };
  }

  function bulkApproveAndWriteBack(filter, reviewer) {
    const list = getAllReviewRecords(filter || { status: STATUS_PENDING });
    let approved = 0;
    let written = 0;
    list.forEach(function (r) {
      const a = approveReview(r.lang, r.key, reviewer);
      if (a.success) {
        approved++;
        const w = writeBackApproved(r.lang, r.key);
        if (w.success) written++;
      }
    });
    return { success: true, total: list.length, approved: approved, written: written };
  }

  async function batchTranslate(lang, keys) {
    const url =
      '/api/i18n/translate?action=batch_translate&lang=' +
      encodeURIComponent(lang) +
      '&keys=' +
      encodeURIComponent(JSON.stringify(keys));
    try {
      const resp = await global.fetch(url);
      const data = await resp.json();
      if (data.code === 0 && data.data) {
        Object.keys(data.data).forEach(function (k) {
          const val = data.data[k];
          updateProposedValue(lang, k, val);
        });
        return { success: true, translations: data.data };
      }
      return { success: false, error: data.msg || 'Translate failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function getVersion() {
    return version;
  }

  function resetAllState() {
    loadLocales();
    reviewRecords = {};
    currentLang = DEFAULT_LANG;
    try {
      localStorage.removeItem('i18n_review_records');
      localStorage.removeItem('i18n_current_lang');
    } catch (e) {}
    bumpVersion();
  }

  global.useI18n = function () {
    return {
      init: init,
      getLang: getLang,
      setLang: setLang,
      t: t,
      getRaw: getRaw,
      getSupportedLangs: getSupportedLangs,
      getReviewRecord: getReviewRecord,
      getAllReviewRecords: getAllReviewRecords,
      getReviewStats: getReviewStats,
      approveReview: approveReview,
      rejectReview: rejectReview,
      writeBackApproved: writeBackApproved,
      resetReview: resetReview,
      updateProposedValue: updateProposedValue,
      bulkApproveReviews: bulkApproveReviews,
      bulkRejectReviews: bulkRejectReviews,
      bulkWriteBackApproved: bulkWriteBackApproved,
      bulkApproveAndWriteBack: bulkApproveAndWriteBack,
      batchTranslate: batchTranslate,
      getVersion: getVersion,
      resetAllState: resetAllState,
      STATUS_PENDING: STATUS_PENDING,
      STATUS_APPROVED: STATUS_APPROVED,
      STATUS_REJECTED: STATUS_REJECTED,
      STATUS_WRITTEN: STATUS_WRITTEN,
      DEFAULT_LANG: DEFAULT_LANG,
      FALLBACK_LANG: FALLBACK_LANG,
    };
  };

  global.I18N_STATUS = {
    PENDING: STATUS_PENDING,
    APPROVED: STATUS_APPROVED,
    REJECTED: STATUS_REJECTED,
    WRITTEN: STATUS_WRITTEN,
  };
})(window);
