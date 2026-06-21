(function (global) {
  const BASE_CURRENCY = 'CNY';
  const SUPPORTED_CURRENCIES = ['CNY', 'USD', 'JPY', 'EUR', 'HKD'];

  const FALLBACK_RATES = {
    CNY: 1.0,
    USD: 0.14,
    JPY: 21.0,
    EUR: 0.13,
    HKD: 1.09,
  };

  const CURRENCY_SYMBOLS = {
    CNY: '¥',
    USD: '$',
    JPY: '¥',
    EUR: '€',
    HKD: 'HK$',
  };

  const CURRENCY_DECIMALS = {
    CNY: 2,
    USD: 2,
    JPY: 0,
    EUR: 2,
    HKD: 2,
  };

  const STATUS_PENDING = 'pending';
  const STATUS_APPROVED = 'approved';
  const STATUS_REJECTED = 'rejected';
  const STATUS_WRITTEN = 'written';

  let currentCurrency = BASE_CURRENCY;
  let customRates = {};
  let isUsingFallbackRates = true;
  let rateReviewRecords = {};
  let version = 0;
  let lastSyncTime = null;

  function bumpVersion() {
    version++;
    if (typeof global.CURRENCY_VERSION_CALLBACK === 'function') {
      global.CURRENCY_VERSION_CALLBACK(version);
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function rateKey(currency) {
    return 'rate::' + currency;
  }

  function ensureRateReviewRecord(currency, fallbackRate, baseRate) {
    const rk = rateKey(currency);
    if (!rateReviewRecords[rk]) {
      rateReviewRecords[rk] = {
        currency: currency,
        baseRate: baseRate !== undefined ? baseRate : FALLBACK_RATES[currency],
        fallbackRate: fallbackRate !== undefined ? fallbackRate : FALLBACK_RATES[currency],
        proposedRate: fallbackRate !== undefined ? fallbackRate : FALLBACK_RATES[currency],
        customRateApplied: null,
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
      persistRateReviewRecords();
      bumpVersion();
    }
    return rateReviewRecords[rk];
  }

  function persistRateReviewRecords() {
    try {
      localStorage.setItem('currency_rate_reviews', JSON.stringify(rateReviewRecords));
    } catch (e) {}
  }

  function restoreRateReviewRecords() {
    try {
      const raw = localStorage.getItem('currency_rate_reviews');
      if (raw) {
        rateReviewRecords = JSON.parse(raw);
      }
    } catch (e) {
      rateReviewRecords = {};
    }
  }

  function persistCurrencyState() {
    try {
      localStorage.setItem(
        'currency_state',
        JSON.stringify({
          currentCurrency: currentCurrency,
          customRates: customRates,
          isUsingFallbackRates: isUsingFallbackRates,
          lastSyncTime: lastSyncTime,
        })
      );
    } catch (e) {}
  }

  function restoreCurrencyState() {
    try {
      const raw = localStorage.getItem('currency_state');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.currentCurrency && SUPPORTED_CURRENCIES.includes(data.currentCurrency)) {
          currentCurrency = data.currentCurrency;
        }
        if (data.customRates && typeof data.customRates === 'object') {
          customRates = data.customRates;
        }
        if (typeof data.isUsingFallbackRates === 'boolean') {
          isUsingFallbackRates = data.isUsingFallbackRates;
        }
        if (data.lastSyncTime) {
          lastSyncTime = data.lastSyncTime;
        }
      }
    } catch (e) {}
  }

  function init() {
    restoreCurrencyState();
    restoreRateReviewRecords();
    bumpVersion();
  }

  function getCurrency() {
    return currentCurrency;
  }

  function getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES.slice();
  }

  function setCurrency(currency) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return { success: false, error: 'Unsupported currency: ' + currency };
    }
    if (currentCurrency === currency) {
      return { success: true, changed: false, currency: currency };
    }
    currentCurrency = currency;
    persistCurrencyState();
    bumpVersion();
    return { success: true, changed: true, currency: currency };
  }

  function getRate(currency) {
    if (customRates[currency] !== undefined) {
      return customRates[currency];
    }
    return FALLBACK_RATES[currency];
  }

  function getEffectiveRate(currency) {
    return getRate(currency);
  }

  function getBaseCurrency() {
    return BASE_CURRENCY;
  }

  function isFallbackRateUsed(currency) {
    return customRates[currency] === undefined;
  }

  function getIsUsingFallbackRates() {
    return isUsingFallbackRates;
  }

  function convert(amount, fromCurrency, toCurrency) {
    const from = fromCurrency || BASE_CURRENCY;
    const to = toCurrency || currentCurrency;
    if (!SUPPORTED_CURRENCIES.includes(from) || !SUPPORTED_CURRENCIES.includes(to)) {
      return { success: false, error: 'Unsupported currency' };
    }
    const fromRate = getRate(from);
    const toRate = getRate(to);
    const baseAmount = from === BASE_CURRENCY ? amount : amount / fromRate;
    const resultAmount = to === BASE_CURRENCY ? baseAmount : baseAmount * toRate;
    return {
      success: true,
      from: from,
      to: to,
      fromRate: fromRate,
      toRate: toRate,
      amount: amount,
      result: resultAmount,
      viaBase: baseAmount,
    };
  }

  function formatNumber(num, decimals) {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function format(amount, currency) {
    const curr = currency || currentCurrency;
    const decimals = CURRENCY_DECIMALS[curr] !== undefined ? CURRENCY_DECIMALS[curr] : 2;
    const symbol = CURRENCY_SYMBOLS[curr] !== undefined ? CURRENCY_SYMBOLS[curr] : curr + ' ';
    let converted = amount;
    if (curr !== BASE_CURRENCY) {
      const c = convert(amount, BASE_CURRENCY, curr);
      if (c.success) {
        converted = c.result;
      }
    }
    return {
      success: true,
      currency: curr,
      symbol: symbol,
      decimals: decimals,
      value: converted,
      formatted: symbol + formatNumber(converted, decimals),
      formattedNoSymbol: formatNumber(converted, decimals),
    };
  }

  async function batchConvert(items, targetCurrency) {
    const target = targetCurrency || currentCurrency;
    const url =
      '/api/currency/convert?action=batch_convert&target=' +
      encodeURIComponent(target) +
      '&items=' +
      encodeURIComponent(JSON.stringify(items));
    try {
      const resp = await global.fetch(url);
      const data = await resp.json();
      if (data.code === 0 && data.data) {
        return { success: true, results: data.data };
      }
    } catch (e) {}
    const results = items.map(function (item) {
      const c = convert(item.amount, item.currency || BASE_CURRENCY, target);
      return {
        id: item.id,
        original: item.amount,
        from: item.currency || BASE_CURRENCY,
        to: target,
        converted: c.success ? c.result : null,
        formatted: c.success ? format(c.result, target).formatted : null,
      };
    });
    return { success: true, results: results, fromLocal: true };
  }

  function setCustomRate(currency, rate) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return { success: false, error: 'Unsupported currency' };
    }
    if (typeof rate !== 'number' || rate <= 0 || !isFinite(rate)) {
      return { success: false, error: 'Invalid rate' };
    }
    customRates[currency] = rate;
    isUsingFallbackRates = false;
    persistCurrencyState();
    bumpVersion();
    return { success: true, currency: currency, rate: rate };
  }

  function resetToFallbackRate(currency) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return { success: false, error: 'Unsupported currency' };
    }
    delete customRates[currency];
    if (Object.keys(customRates).length === 0) {
      isUsingFallbackRates = true;
    }
    persistCurrencyState();
    bumpVersion();
    return { success: true, currency: currency, fallbackRate: FALLBACK_RATES[currency] };
  }

  function getAllFallbackRates() {
    return deepClone(FALLBACK_RATES);
  }

  function getAllCustomRates() {
    return deepClone(customRates);
  }

  function getCurrencySymbols() {
    return deepClone(CURRENCY_SYMBOLS);
  }

  function getRateReviewRecord(currency) {
    const rk = rateKey(currency);
    return rateReviewRecords[rk] ? deepClone(rateReviewRecords[rk]) : null;
  }

  function getAllRateReviewRecords(filter) {
    const list = Object.keys(rateReviewRecords).map(function (k) {
      return deepClone(rateReviewRecords[k]);
    });
    if (!filter) return list;
    return list.filter(function (r) {
      if (filter.currency && r.currency !== filter.currency) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    });
  }

  function getRateReviewStats() {
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      written: 0,
    };
    Object.keys(rateReviewRecords).forEach(function (k) {
      const r = rateReviewRecords[k];
      stats.total++;
      stats[r.status] = (stats[r.status] || 0) + 1;
    });
    return stats;
  }

  function approveRateReview(currency, reviewer) {
    const rk = rateKey(currency);
    const rec = rateReviewRecords[rk];
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
    persistRateReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function rejectRateReview(currency, reviewer, reason) {
    const rk = rateKey(currency);
    const rec = rateReviewRecords[rk];
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
    persistRateReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function writeBackApprovedRate(currency) {
    const rk = rateKey(currency);
    const rec = rateReviewRecords[rk];
    if (!rec) return { success: false, error: 'Record not found' };
    if (rec.status !== STATUS_APPROVED) {
      return { success: false, error: 'Can only write back approved records' };
    }
    customRates[currency] = rec.proposedRate;
    rec.customRateApplied = rec.proposedRate;
    rec.status = STATUS_WRITTEN;
    rec.writeBackTime = new Date().toISOString();
    isUsingFallbackRates = false;
    rec.history.push({
      action: 'writeBack',
      status: STATUS_WRITTEN,
      appliedRate: rec.proposedRate,
      time: rec.writeBackTime,
    });
    persistRateReviewRecords();
    persistCurrencyState();
    bumpVersion();
    return { success: true, record: deepClone(rec), rate: rec.proposedRate };
  }

  function resetRateReview(currency) {
    const rk = rateKey(currency);
    const rec = rateReviewRecords[rk];
    if (!rec) return { success: false, error: 'Record not found' };
    rec.status = STATUS_PENDING;
    rec.reviewer = null;
    rec.reviewTime = null;
    rec.writeBackTime = null;
    rec.proposedRate = rec.fallbackRate;
    rec.history.push({
      action: 'reset',
      status: STATUS_PENDING,
      time: new Date().toISOString(),
    });
    persistRateReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function updateProposedRate(currency, rate) {
    if (typeof rate !== 'number' || rate <= 0 || !isFinite(rate)) {
      return { success: false, error: 'Invalid rate' };
    }
    const rk = rateKey(currency);
    let rec = rateReviewRecords[rk];
    if (!rec) {
      rec = ensureRateReviewRecord(currency, rate);
    }
    if (rec.status === STATUS_WRITTEN) {
      rec.status = STATUS_PENDING;
      rec.reviewer = null;
      rec.reviewTime = null;
      rec.writeBackTime = null;
    }
    rec.proposedRate = rate;
    rec.history.push({
      action: 'updateProposed',
      to: rate,
      status: rec.status,
      time: new Date().toISOString(),
    });
    persistRateReviewRecords();
    bumpVersion();
    return { success: true, record: deepClone(rec) };
  }

  function bulkApproveRates(filter, reviewer) {
    const list = getAllRateReviewRecords(filter || { status: STATUS_PENDING });
    let count = 0;
    list.forEach(function (r) {
      const result = approveRateReview(r.currency, reviewer);
      if (result.success) count++;
    });
    return { success: true, total: list.length, approved: count };
  }

  function bulkApproveAndWriteBackRates(filter, reviewer) {
    const list = getAllRateReviewRecords(filter || { status: STATUS_PENDING });
    let approved = 0;
    let written = 0;
    list.forEach(function (r) {
      const a = approveRateReview(r.currency, reviewer);
      if (a.success) {
        approved++;
        const w = writeBackApprovedRate(r.currency);
        if (w.success) written++;
      }
    });
    return { success: true, total: list.length, approved: approved, written: written };
  }

  async function syncLiveRates() {
    const url = '/api/currency/rates?action=config';
    try {
      const resp = await global.fetch(url);
      const data = await resp.json();
      if (data.code === 0 && data.data && data.data.currency) {
        const cur = data.data.currency;
        if (cur.rates && typeof cur.rates === 'object') {
          Object.keys(cur.rates).forEach(function (curr) {
            if (SUPPORTED_CURRENCIES.includes(curr) && curr !== BASE_CURRENCY) {
              const rate = Number(cur.rates[curr]);
              if (isFinite(rate) && rate > 0) {
                if (cur.is_fallback) {
                  triggerRateReviewForFallbacks(curr, rate);
                } else {
                  customRates[curr] = rate;
                }
              }
            }
          });
          if (cur.is_fallback) {
            isUsingFallbackRates = true;
          } else {
            isUsingFallbackRates = false;
          }
        }
        lastSyncTime = new Date().toISOString();
        persistCurrencyState();
        bumpVersion();
        return { success: true, rates: deepClone(cur.rates || {}), isFallback: !!cur.is_fallback, syncTime: lastSyncTime };
      }
      return { success: false, error: data.msg || 'Sync failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function triggerRateReviewForFallbacks(currency, rate) {
    if (currency) {
      ensureRateReviewRecord(currency, rate !== undefined ? rate : FALLBACK_RATES[currency]);
    } else {
      SUPPORTED_CURRENCIES.forEach(function (c) {
        if (c !== BASE_CURRENCY) {
          ensureRateReviewRecord(c, FALLBACK_RATES[c]);
        }
      });
    }
  }

  function getLastSyncTime() {
    return lastSyncTime;
  }

  function getVersion() {
    return version;
  }

  function clearRateReviewStore() {
    rateReviewRecords = {};
    try {
      localStorage.removeItem('currency_rate_reviews');
    } catch (e) {}
  }

  function resetAllState() {
    currentCurrency = BASE_CURRENCY;
    customRates = {};
    isUsingFallbackRates = true;
    rateReviewRecords = {};
    lastSyncTime = null;
    try {
      localStorage.removeItem('currency_state');
      localStorage.removeItem('currency_rate_reviews');
    } catch (e) {}
    bumpVersion();
  }

  global.useCurrency = function () {
    return {
      init: init,
      getCurrency: getCurrency,
      setCurrency: setCurrency,
      getSupportedCurrencies: getSupportedCurrencies,
      getBaseCurrency: getBaseCurrency,
      getRate: getRate,
      getEffectiveRate: getEffectiveRate,
      isFallbackRateUsed: isFallbackRateUsed,
      getIsUsingFallbackRates: getIsUsingFallbackRates,
      convert: convert,
      format: format,
      formatNumber: formatNumber,
      batchConvert: batchConvert,
      setCustomRate: setCustomRate,
      resetToFallbackRate: resetToFallbackRate,
      getAllFallbackRates: getAllFallbackRates,
      getAllCustomRates: getAllCustomRates,
      getCurrencySymbols: getCurrencySymbols,
      getRateReviewRecord: getRateReviewRecord,
      getAllRateReviewRecords: getAllRateReviewRecords,
      getRateReviewStats: getRateReviewStats,
      approveRateReview: approveRateReview,
      rejectRateReview: rejectRateReview,
      writeBackApprovedRate: writeBackApprovedRate,
      resetRateReview: resetRateReview,
      updateProposedRate: updateProposedRate,
      bulkApproveRates: bulkApproveRates,
      bulkApproveAndWriteBackRates: bulkApproveAndWriteBackRates,
      syncLiveRates: syncLiveRates,
      triggerRateReviewForFallbacks: triggerRateReviewForFallbacks,
      getLastSyncTime: getLastSyncTime,
      getVersion: getVersion,
      clearRateReviewStore: clearRateReviewStore,
      resetAllState: resetAllState,
      FALLBACK_RATES: deepClone(FALLBACK_RATES),
      BASE_CURRENCY: BASE_CURRENCY,
      STATUS_PENDING: STATUS_PENDING,
      STATUS_APPROVED: STATUS_APPROVED,
      STATUS_REJECTED: STATUS_REJECTED,
      STATUS_WRITTEN: STATUS_WRITTEN,
    };
  };

  global.CURRENCY_STATUS = {
    PENDING: STATUS_PENDING,
    APPROVED: STATUS_APPROVED,
    REJECTED: STATUS_REJECTED,
    WRITTEN: STATUS_WRITTEN,
  };
})(window);
