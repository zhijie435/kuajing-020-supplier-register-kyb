(function () {
  'use strict';

  // =====================================================
  // Mock Fetch API - 拦截所有后端请求，返回模拟数据
  // =====================================================
  window.fetch = async function (url, options) {
    url = String(url);
    try {
      if (url.includes('action=config') || url.includes('rates?')) {
        return mockResponse({
          code: 0, msg: 'ok',
          data: { currency: {
            base: 'CNY', is_fallback: true,
            rates: { CNY: 1.0, USD: 0.14, JPY: 21.0, EUR: 0.13, HKD: 1.09 },
            updated_at: new Date().toISOString()
          }}
        });
      }
      if (url.includes('batch_convert')) {
        return mockResponse({ code: 0, data: { note: 'local_fallback' } });
      }
      if (url.includes('batch_translate')) {
        return mockResponse({ code: 0, data: {
          'demo.fallback_notice': '[AI Translated] This triggered fallback chain',
          'demo.fallback_rate': '[AI Translated] Using fallback rate'
        }});
      }
      return mockResponse({ code: -1, msg: 'Unknown endpoint' }, 404);
    } catch (e) {
      return mockResponse({ code: -1, msg: e.message }, 500);
    }
  };

  function mockResponse(data, status) {
    return {
      ok: (status || 200) >= 200 && (status || 200) < 300,
      status: status || 200,
      json: async function () { return data; },
      text: async function () { return JSON.stringify(data); }
    };
  }

  // =====================================================
  // 自研轻量级测试框架
  // =====================================================
  const TestRunner = {
    suites: [], currentSuite: null,
    results: { total: 0, pass: 0, fail: 0, duration: 0 },
    startedAt: 0,

    describe: function (name, fn) {
      if (!this.suites) this.suites = [];
      this.currentSuite = { name: name, cases: [] };
      fn.call(this);
      this.suites.push(this.currentSuite);
    },

    it: function (name, desc, fn) {
      if (!this.currentSuite) return;
      this.currentSuite.cases.push({
        name: name, desc: desc, fn: fn,
        status: 'pending', duration: 0, error: null
      });
    },

    async runAll: function (onProgress) {
      this.results = { total: 0, pass: 0, fail: 0, duration: 0 };
      this.startedAt = Date.now();
      let suiteIdx = 0;
      for (const suite of this.suites) {
        let caseIdx = 0;
        for (const c of suite.cases) {
          c.status = 'running';
          if (onProgress) onProgress({ type: 'case_start', suite: suiteIdx, suiteName: suite.name, idx: caseIdx, caseName: c.name });
          const t0 = Date.now();
          try {
            const p = c.fn.call(this);
            if (p && typeof p.then === 'function') await p;
            c.status = 'pass'; this.results.pass++;
          } catch (err) {
            c.status = 'fail';
            c.error = err && (err.stack || err.message || String(err));
            this.results.fail++;
          }
          c.duration = Date.now() - t0;
          this.results.total++;
          if (onProgress) onProgress({
            type: 'case_end', suite: suiteIdx, suiteName: suite.name, idx: caseIdx, caseName: c.name,
            status: c.status, error: c.error, duration: c.duration,
            total: this.results.total, pass: this.results.pass, fail: this.results.fail
          });
          caseIdx++;
        }
        suiteIdx++;
      }
      this.results.duration = Date.now() - this.startedAt;
      if (onProgress) onProgress({ type: 'all_done', results: this.results });
      return this.results;
    },

    render: function (container) {
      if (!container) return;
      let html = '';
      this.suites.forEach((suite, sIdx) => {
        const pass = suite.cases.filter(c => c.status === 'pass').length;
        const fail = suite.cases.filter(c => c.status === 'fail').length;
        const running = suite.cases.filter(c => c.status === 'running').length;
        html += `<div class="suite" data-suite="${sIdx}">`;
        html += `<div class="suite-header" onclick="this.nextElementSibling.classList.toggle('open')">`;
        html += `<div class="suite-title"><div class="suite-num">${sIdx + 1}</div><span>${suite.name}</span></div>`;
        html += `<div class="suite-stats">`;
        html += `<span class="total-count">共 ${suite.cases.length}</span>`;
        if (pass > 0) html += `<span class="pass-count">✓ ${pass}</span>`;
        if (fail > 0) html += `<span class="fail-count">✗ ${fail}</span>`;
        if (running > 0) html += `<span style="background:#fefcbf;color:#744210">⏳ ${running}</span>`;
        html += `</div></div>`;
        html += `<div class="suite-body${sIdx === 0 ? ' open' : ''}">`;
        suite.cases.forEach((c, cIdx) => {
          const ic = { pass: 'pass', fail: 'fail', running: 'running', pending: 'pending' }[c.status] || 'pending';
          const ich = { pass: '✓', fail: '✗', running: '◌', pending: '·' }[c.status] || '·';
          html += `<div class="case" data-case="${cIdx}">`;
          html += `<div class="case-icon ${ic}">${ich}</div>`;
          html += `<div class="case-info"><div class="case-name">${c.name}</div><div class="case-desc">${c.desc || ''}</div>`;
          if (c.error) html += `<div class="case-error">${String(c.error).replace(/</g, '&lt;').slice(0, 2000)}</div>`;
          html += `</div>`;
          if (c.duration > 0) html += `<div class="case-duration">${c.duration}ms</div>`;
          html += `</div>`;
        });
        html += `</div></div>`;
      });
      container.innerHTML = html;
    }
  };

  // =====================================================
  // 断言库
  // =====================================================
  function assert(cond, msg) { if (!cond) throw new Error(msg || ('Assertion failed')); }
  function assertEqual(a, b, msg) {
    if (a !== b) throw new Error((msg || 'AssertEqual failed') + ' — expected: ' + JSON.stringify(b) + ' actual: ' + JSON.stringify(a));
  }
  function assertTrue(v, msg) { assert(v === true, msg || ('Expected true but got ' + JSON.stringify(v))); }
  function assertFalse(v, msg) { assert(v === false, msg || ('Expected false but got ' + JSON.stringify(v))); }
  function assertNotNull(v, msg) { assert(v != null, msg || ('Expected non-null but got ' + JSON.stringify(v))); }
  function assertNull(v, msg) { assert(v == null, msg || ('Expected null but got ' + JSON.stringify(v))); }
  function assertClose(a, b, eps, msg) {
    eps = eps || 0.01;
    if (Math.abs(a - b) > eps) throw new Error((msg || 'AssertClose failed') + ' — expected ≈ ' + b + ' actual: ' + a);
  }
  function assertInclude(str, sub, msg) {
    if (!(typeof str === 'string' && str.includes(String(sub))))
      throw new Error((msg || 'AssertInclude failed') + ' — expected "' + sub + '" in "' + str + '"');
  }
  function assertSuccess(r, msg) { assertTrue(r && r.success, msg || ('Expected success, got ' + JSON.stringify(r))); }

  // =====================================================
  // 工具函数
  // =====================================================
  function resetAllState() {
    const i18n = window.useI18n();
    const cur = window.useCurrency();
    i18n.resetAllState(); cur.resetAllState();
    try { localStorage.clear(); } catch (e) {}
    i18n.init(); cur.init();
  }

  function setFlowNode(type, nodeName, state) {
    const id = type === 'i18n' ? 'flowI18n' : 'flowCurrency';
    const d = document.getElementById(id); if (!d) return;
    const n = d.querySelector('[data-node="' + nodeName + '"]'); if (!n) return;
    n.classList.remove('current', 'done'); if (state) n.classList.add(state);
  }
  function setStepLog(type, text) {
    const id = type === 'i18n' ? 'i18nStepLog' : 'currencyStepLog';
    const el = document.getElementById(id); if (el) el.textContent = text;
  }
  function updateStats(total, pass, fail) {
    const rate = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : '—';
    ['statTotal','statPass','statFail','statRate'].forEach(i => {
      const el = document.getElementById(i); if (!el) return;
      if (i === 'statTotal') el.textContent = total;
      else if (i === 'statPass') el.textContent = pass;
      else if (i === 'statFail') el.textContent = fail;
      else el.textContent = rate;
    });
  }

  function handleProgress(evt) {
    const c = document.getElementById('suitesContainer');
    TestRunner.render(c);
    if (evt.type === 'case_start' || evt.type === 'case_end')
      updateStats(evt.total || 0, evt.pass || 0, evt.fail || 0);
    if (evt.type === 'all_done') updateStats(evt.results.total, evt.results.pass, evt.results.fail);
  }

  // =====================================================
  // 用例注册
  // =====================================================
  function registerTests() {
    TestRunner.suites = []; TestRunner.currentSuite = null;
    const describe = TestRunner.describe.bind(TestRunner);
    const it = TestRunner.it.bind(TestRunner);

    // ===== Suite 1: 多语言切换基础功能 =====
    describe('Suite 1: 多语言切换基础功能', function () {
      it('初始化默认语言为 zh-CN', '默认中文', function () {
        resetAllState();
        const i18n = window.useI18n();
        assertEqual(i18n.getLang(), 'zh-CN');
      });
      it('支持 3 种语言', 'zh-CN/en-US/ja-JP', function () {
        const i18n = window.useI18n();
        const ls = i18n.getSupportedLangs();
        assertEqual(ls.length, 3);
        assertTrue(ls.includes('zh-CN') && ls.includes('en-US') && ls.includes('ja-JP'));
      });
      it('setLang 切换到 en-US 成功', 'changed=true', function () {
        resetAllState();
        const r = window.useI18n().setLang('en-US');
        assertSuccess(r); assertTrue(r.changed);
      });
      it('setLang 重复设置不触发 change', '幂等性', function () {
        resetAllState();
        const i18n = window.useI18n();
        i18n.setLang('en-US');
        assertFalse(i18n.setLang('en-US').changed);
      });
      it('setLang 切换 ja-JP 成功', '日语切换', function () {
        resetAllState();
        assertSuccess(window.useI18n().setLang('ja-JP'));
      });
      it('setLang 不支持的语言失败', 'fr-FR 不支持', function () {
        assertFalse(window.useI18n().setLang('fr-FR').success);
      });
      it('中文模式 t() 返回正确文案', 'app.title / nav.dashboard', function () {
        resetAllState();
        const i18n = window.useI18n();
        assertEqual(i18n.t('app.title'), '在线课程教务系统');
        assertEqual(i18n.t('nav.dashboard'), '仪表盘');
      });
      it('t() 参数插值正确', '{name} 模板替换', function () {
        resetAllState();
        assertEqual(window.useI18n().t('dashboard.welcome', {name:'Alice'}), '欢迎回来，Alice');
      });
    });

    // ===== Suite 2: 多语言文案翻译回退链触发 =====
    describe('Suite 2: 多语言文案翻译回退链触发', function () {
      it('en-US 模式返回英文', '不触发回退', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('en-US');
        assertEqual(i18n.t('app.title'), 'Online Course Administration');
      });
      it('ja-JP 存在的 key 返回日语', 'app.title / nav.dashboard', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        assertEqual(i18n.t('app.title'), 'オンラインコース管理システム');
      });
      it('ja-JP 缺失 demo.desc_3 → 回退 en-US', '日语→英语回退', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        assertEqual(i18n.t('demo.desc_3'), 'Missing in Japanese, should fallback to English, then Chinese');
      });
      it('回退触发 Pending 审核记录 (demo.fallback_notice)', 'ensureReviewRecord 创建', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.fallback_notice');
        const r = i18n.getReviewRecord('ja-JP', 'demo.fallback_notice');
        assertNotNull(r); assertEqual(r.status, 'pending');
        setFlowNode('i18n', 'fallback', 'done'); setFlowNode('i18n', 'pending', 'current');
        setStepLog('i18n', '✓ 回退链触发 → Pending 审核记录创建 (demo.fallback_notice)');
      });
      it('审核记录 original 为中文值', 'original 字段校验', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.live_rate');
        assertEqual(i18n.getReviewRecord('ja-JP', 'demo.live_rate').original, '实时汇率更新中');
      });
      it('审核记录 fallback 为英文值', 'fallback 字段校验', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.fallback_rate');
        assertEqual(i18n.getReviewRecord('ja-JP', 'demo.fallback_rate').fallback, 'Using fallback rate, please review and confirm');
      });
      it('validation.* 系列全部触发回退', '4 个 validation key', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        ['validation.name_required','validation.email_required','validation.phone_required','validation.invalid_email'].forEach(k => i18n.t(k));
        assertEqual(i18n.getAllReviewRecords({lang:'ja-JP', status:'pending'}).length, 4);
      });
      it('完全不存在的 key 创建审核记录', '兜底机制', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('en-US');
        assertEqual(i18n.t('no.such.key.at.all.12345'), 'no.such.key.at.all.12345');
        assertNotNull(i18n.getReviewRecord('en-US', 'no.such.key.at.all.12345'));
      });
      it('当前语言已存在的 key 不创建审核记录', '命中不触发', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('en-US');
        i18n.t('app.title');
        assertNull(i18n.getReviewRecord('en-US', 'app.title'));
      });
    });

    // ===== Suite 3: 文案回退审核状态闭环 (16 用例) =====
    describe('Suite 3: 文案回退审核状态闭环', function () {
      it('reset 后审核列表为空', '初始化清洁度', function () {
        resetAllState();
        assertEqual(window.useI18n().getAllReviewRecords().length, 0);
      });
      it('Pending → Approved (demo.fallback_notice)', 'approveReview', function () {
        resetAllState();
        setFlowNode('i18n', 'pending', 'current'); setStepLog('i18n', '⏳ Pending→Approved (demo.fallback_notice)');
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.fallback_notice');
        const r = i18n.approveReview('ja-JP', 'demo.fallback_notice', 'admin_1');
        assertSuccess(r); assertEqual(r.record.status, 'approved'); assertEqual(r.record.reviewer, 'admin_1');
        setFlowNode('i18n', 'pending', 'done'); setFlowNode('i18n', 'approved', 'current');
        setStepLog('i18n', '✓ Pending→Approved 通过 (demo.fallback_notice by admin_1)');
      });
      it('Approved → Written (demo.fallback_notice)', 'writeBackApproved', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.fallback_notice');
        i18n.approveReview('ja-JP', 'demo.fallback_notice', 'admin');
        const w = i18n.writeBackApproved('ja-JP', 'demo.fallback_notice');
        assertSuccess(w); assertEqual(w.record.status, 'written');
        setFlowNode('i18n', 'approved', 'done'); setFlowNode('i18n', 'written', 'current');
        setStepLog('i18n', '✓ Approved→Written 回写成功');
      });
      it('Pending → Rejected (demo.live_rate)', 'rejectReview', function () {
        resetAllState();
        setFlowNode('i18n', 'pending', 'current'); setStepLog('i18n', '⏳ Pending→Rejected (demo.live_rate)');
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.live_rate');
        const r = i18n.rejectReview('ja-JP', 'demo.live_rate', 'aud_2', '翻译不准确');
        assertSuccess(r); assertEqual(r.record.status, 'rejected');
        setFlowNode('i18n', 'pending', 'done'); setFlowNode('i18n', 'rejected', 'current');
        setStepLog('i18n', '✓ Pending→Rejected (demo.live_rate)');
      });
      it('Rejected → Approved 重新通过 (demo.live_rate)', '拒绝后再批准', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.live_rate'); i18n.rejectReview('ja-JP','demo.live_rate','a');
        assertSuccess(i18n.approveReview('ja-JP','demo.live_rate','b'));
      });
      it('updateProposedValue 修改提案 (demo.sync_success)', 'pending 修改', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.sync_success');
        const u = i18n.updateProposedValue('ja-JP','demo.sync_success','同期成功・更新済');
        assertSuccess(u); assertEqual(u.record.proposed, '同期成功・更新済');
      });
      it('Written 修改提案 → 回到 Pending (validation.name_required)', '二次审核触发', function () {
        resetAllState();
        setFlowNode('i18n', 'written', 'current');
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('validation.name_required');
        i18n.approveReview('ja-JP','validation.name_required','a');
        i18n.writeBackApproved('ja-JP','validation.name_required');
        assertEqual(i18n.getReviewRecord('ja-JP','validation.name_required').status, 'written');
        const u = i18n.updateProposedValue('ja-JP','validation.name_required','氏名必須項目！');
        assertSuccess(u); assertEqual(u.record.status, 'pending');
        setFlowNode('i18n', 'written', 'done'); setFlowNode('i18n', 'pending', 'current');
        setStepLog('i18n', '✓ Written 修改提案 → 自动回 Pending (二次审核)');
      });
      it('Approved 不能重复 approve', '非法流转拦截', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('validation.email_required'); i18n.approveReview('ja-JP','validation.email_required','a');
        assertFalse(i18n.approveReview('ja-JP','validation.email_required','b').success);
      });
      it('Rejected 不能重复 reject', '已拒绝拦截', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('validation.phone_required'); i18n.rejectReview('ja-JP','validation.phone_required','a');
        assertFalse(i18n.rejectReview('ja-JP','validation.phone_required','a').success);
      });
      it('resetReview 重置状态 (demo.test_key)', 'reset→pending', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        i18n.t('demo.test_key'); i18n.approveReview('ja-JP','demo.test_key','a');
        const rs = i18n.resetReview('ja-JP','demo.test_key');
        assertSuccess(rs); assertEqual(rs.record.status, 'pending');
      });
      it('不存在的记录返回 Record not found', '边界', function () {
        resetAllState();
        assertInclude(window.useI18n().approveReview('ja-JP','no.key').error, 'Record not found');
      });
      it('getReviewStats 统计正确', '4 key: 1a/1r/2p', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        ['demo.desc_3','demo.fallback_notice','demo.live_rate','demo.fallback_rate'].forEach(k => i18n.t(k));
        i18n.approveReview('ja-JP','demo.desc_3','a');
        i18n.rejectReview('ja-JP','demo.fallback_notice','b');
        const s = i18n.getReviewStats();
        assertEqual(s.total, 4); assertEqual(s.approved, 1); assertEqual(s.rejected, 1); assertEqual(s.pending, 2);
      });
      it('bulkApproveReviews 批量通过', '4 条全部通过', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        ['demo.desc_3','demo.fallback_notice','demo.live_rate','demo.fallback_rate'].forEach(k => i18n.t(k));
        const b = i18n.bulkApproveReviews(null,'batch');
        assertSuccess(b); assertEqual(b.approved, 4);
      });
      it('bulkWriteBackApproved 批量回写', '2 条写入', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        ['demo.desc_3','demo.fallback_notice'].forEach(k => i18n.t(k));
        i18n.bulkApproveReviews(null,'a');
        const b = i18n.bulkWriteBackApproved(null);
        assertSuccess(b); assertEqual(b.written, 2); assertEqual(i18n.getReviewStats().written, 2);
      });
      it('bulkApproveAndWriteBack 一键闭环 (demo.live_rate + demo.fallback_rate)', '原子操作', function () {
        resetAllState();
        setStepLog('i18n', '⏳ bulkApproveAndWriteBack 一键批量闭环');
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        ['demo.live_rate','demo.fallback_rate'].forEach(k => i18n.t(k));
        const b = i18n.bulkApproveAndWriteBack(null,'op');
        assertSuccess(b); assertEqual(b.approved, 2); assertEqual(b.written, 2);
        setFlowNode('i18n','approved','done'); setFlowNode('i18n','written','done');
        setStepLog('i18n', '✓ 一键批量闭环：2 条 Pending→Approved→Written');
      });
      it('getAllReviewRecords 筛选: lang+status', '按语言状态筛选', function () {
        resetAllState();
        const i18n = window.useI18n(); i18n.setLang('ja-JP');
        ['demo.desc_3','demo.fallback_notice'].forEach(k => i18n.t(k));
        i18n.setLang('en-US'); i18n.t('non.exist.1');
        i18n.approveReview('ja-JP','demo.desc_3','a');
        assertEqual(i18n.getAllReviewRecords({lang:'ja-JP', status:'pending'}).length, 1);
      });
    });

    // ===== Suite 4: 多币种切换基础功能 (8 用例) =====
    describe('Suite 4: 多币种切换基础功能', function () {
      it('默认货币为 CNY', '基准货币', function () {
        resetAllState(); assertEqual(window.useCurrency().getCurrency(), 'CNY');
      });
      it('支持 5 种货币', 'CNY/USD/JPY/EUR/HKD', function () {
        const l = window.useCurrency().getSupportedCurrencies();
        assertEqual(l.length, 5);
        ['CNY','USD','JPY','EUR','HKD'].forEach(c => assertTrue(l.includes(c)));
      });
      it('setCurrency 切换 USD 成功', 'changed=true', function () {
        resetAllState();
        const r = window.useCurrency().setCurrency('USD');
        assertSuccess(r); assertTrue(r.changed);
      });
      it('setCurrency 同一货币不触发 change', '幂等', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('JPY');
        assertFalse(c.setCurrency('JPY').changed);
      });
      it('EUR / HKD 切换成功', '两种切换', function () {
        resetAllState();
        const c = window.useCurrency();
        assertSuccess(c.setCurrency('EUR')); assertEqual(c.getCurrency(), 'EUR');
        assertSuccess(c.setCurrency('HKD')); assertEqual(c.getCurrency(), 'HKD');
      });
      it('不支持的货币失败', 'KRW 不支持', function () {
        assertFalse(window.useCurrency().setCurrency('KRW').success);
      });
      it('初始使用回退汇率', 'isUsingFallbackRates=true', function () {
        resetAllState(); assertTrue(window.useCurrency().getIsUsingFallbackRates());
      });
      it('默认汇率常量值', 'FALLBACK_RATES 校验', function () {
        const fb = window.useCurrency().getAllFallbackRates();
        assertEqual(fb.CNY, 1.0); assertClose(fb.USD, 0.14); assertClose(fb.JPY, 21);
        assertClose(fb.EUR, 0.13); assertClose(fb.HKD, 1.09);
      });
    });

    // ===== Suite 5: 汇率换算与格式化 (16 用例) =====
    describe('Suite 5: 汇率换算与格式化', function () {
      it('CNY→USD 100≈14', '基础换算', function () {
        resetAllState();
        const r = window.useCurrency().convert(100,'CNY','USD');
        assertSuccess(r); assertClose(r.result, 14);
      });
      it('CNY→JPY 100≈2100', '日元换算', function () {
        resetAllState();
        const r = window.useCurrency().convert(100,'CNY','JPY');
        assertClose(r.result, 2100);
      });
      it('CNY→EUR 500≈65', '欧元换算', function () {
        resetAllState(); assertClose(window.useCurrency().convert(500,'CNY','EUR').result, 65);
      });
      it('USD→CNY 14≈100', '反向换算', function () {
        resetAllState(); assertClose(window.useCurrency().convert(14,'USD','CNY').result, 100);
      });
      it('USD→JPY 跨币种 1≈150', 'USD→CNY→JPY', function () {
        resetAllState(); assertClose(window.useCurrency().convert(1,'USD','JPY').result, 150, 1);
      });
      it('不支持币种 convert 失败', 'KRW 边界', function () {
        assertFalse(window.useCurrency().convert(100,'CNY','KRW').success);
      });
      it('CNY 格式: ¥1,299.00', '千分位+符号', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('CNY');
        assertEqual(c.format(1299).formatted, '¥1,299.00');
      });
      it('USD 格式含 $', '美元符号', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('USD');
        assertInclude(c.format(299).formatted, '$');
      });
      it('JPY 无小数位', 'JPY decimals=0', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('JPY');
        assertEqual(c.format(100).decimals, 0);
      });
      it('HKD 格式含 HK$', '港币符号', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('HKD');
        assertInclude(c.format(1000).formatted, 'HK$');
      });
      it('EUR 格式含 €', '欧元符号', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('EUR');
        assertInclude(c.format(1000).formatted, '€');
      });
      it('自定义汇率 USD=0.15 生效', 'customRate', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCustomRate('USD', 0.15);
        assertClose(c.convert(100,'CNY','USD').result, 15);
      });
      it('自定义汇率后 fallback=false', 'isUsingFallbackRates', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCustomRate('EUR', 0.12);
        assertFalse(c.getIsUsingFallbackRates());
      });
      it('resetToFallbackRate 恢复默认', '重置汇率', function () {
        resetAllState();
        const c = window.useCurrency(); c.setCustomRate('USD', 0.2);
        c.resetToFallbackRate('USD');
        assertTrue(c.isFallbackRateUsed('USD'));
        assertClose(c.convert(100,'CNY','USD').result, 14);
      });
      it('batchConvert 批量换算 (4条课程)', '批量转换', async function () {
        resetAllState();
        const c = window.useCurrency(); c.setCurrency('USD');
        const items = [{id:1,amount:299},{id:2,amount:899},{id:3,amount:599},{id:4,amount:1999}];
        const r = await c.batchConvert(items, 'USD');
        assertSuccess(r); assertEqual(r.results.length, 4);
        assertClose(r.results[0].converted, 41.86, 0.1);
      });
      it('setCustomRate 非法值拦截', '0/负数/NaN', function () {
        resetAllState();
        const c = window.useCurrency();
        assertFalse(c.setCustomRate('USD', 0).success);
        assertFalse(c.setCustomRate('USD', -1).success);
        assertFalse(c.setCustomRate('USD', NaN).success);
      });
    });

    // ===== Suite 6: 汇率回退审核状态闭环 (18 用例) =====
    describe('Suite 6: 汇率回退审核状态闭环', function () {
      it('triggerRateReviewForFallbacks 创建 4 条 Pending', 'USD/JPY/EUR/HKD', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        const all = c.getAllRateReviewRecords();
        assertEqual(all.length, 4);
        all.forEach(r => assertEqual(r.status, 'pending'));
        setFlowNode('currency','fallback','done'); setFlowNode('currency','pending','current');
        setStepLog('currency', '✓ 触发回退汇率 → 4 条 Pending 创建');
      });
      it('getRateReviewRecord 获取单条 USD', '字段校验', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        const r = c.getRateReviewRecord('USD');
        assertNotNull(r); assertClose(r.baseRate, 0.14); assertClose(r.proposedRate, 0.14);
      });
      it('Pending→Approved (JPY)', 'approveRateReview', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        setFlowNode('currency','pending','current'); setStepLog('currency','⏳ Pending→Approved (JPY)');
        const r = c.approveRateReview('JPY', 'fx_admin');
        assertSuccess(r); assertEqual(r.record.status, 'approved');
        setFlowNode('currency','pending','done'); setFlowNode('currency','approved','current');
        setStepLog('currency','✓ Pending→Approved (JPY by fx_admin)');
      });
      it('Approved→Written (JPY)', 'writeBackApprovedRate → customRates', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.approveRateReview('JPY', 'a');
        const w = c.writeBackApprovedRate('JPY');
        assertSuccess(w); assertEqual(w.record.status, 'written');
        assertFalse(c.isFallbackRateUsed('JPY'));
        setFlowNode('currency','approved','done'); setFlowNode('currency','written','current');
        setStepLog('currency','✓ Approved→Written (JPY 写入 customRates)');
      });
      it('Pending→Rejected (JPY 独立 reset)', 'rejectRateReview', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        setFlowNode('currency','pending','current'); setStepLog('currency','⏳ Pending→Rejected (JPY)');
        const r = c.rejectRateReview('JPY', 'aud', '波动过高');
        assertSuccess(r); assertEqual(r.record.status, 'rejected');
        setFlowNode('currency','pending','done'); setFlowNode('currency','rejected','current');
        setStepLog('currency','✓ Pending→Rejected (JPY: 波动过高)');
      });
      it('Rejected→Approved (JPY 独立 reset)', '拒绝后再批准', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.rejectRateReview('JPY','a');
        assertSuccess(c.approveRateReview('JPY','mgr'));
      });
      it('updateProposedRate 修改 USD (独立 reset)', 'pending 修改', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        const u = c.updateProposedRate('USD', 0.142);
        assertSuccess(u); assertClose(u.record.proposedRate, 0.142);
      });
      it('Written 修改提案 → 回 Pending (USD 独立 reset)', '二次审核', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.approveRateReview('USD','a'); c.writeBackApprovedRate('USD');
        assertEqual(c.getRateReviewRecord('USD').status, 'written');
        const u = c.updateProposedRate('USD', 0.145);
        assertSuccess(u); assertEqual(u.record.status, 'pending');
        setFlowNode('currency','written','done'); setFlowNode('currency','pending','current');
        setStepLog('currency','✓ Written 修改提案 → 自动回 Pending (USD 二次审核)');
      });
      it('resetRateReview 重置 (HKD 独立 reset)', 'HKD reset', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.approveRateReview('HKD','a');
        const rs = c.resetRateReview('HKD');
        assertSuccess(rs); assertEqual(rs.record.status, 'pending');
      });
      it('getRateReviewStats 统计 (1a/1r/2p)', '4 币种统计', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        assertEqual(c.getAllRateReviewRecords().length, 4);
        c.approveRateReview('USD','a'); c.rejectRateReview('EUR','b');
        const s = c.getRateReviewStats();
        assertEqual(s.total, 4); assertEqual(s.approved, 1); assertEqual(s.rejected, 1); assertEqual(s.pending, 2);
      });
      it('bulkApproveRates 批量通过 4 条', '批量 approve', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        const b = c.bulkApproveRates(null,'batch');
        assertSuccess(b); assertEqual(b.approved, 4);
      });
      it('bulkApproveAndWriteBackRates 一键闭环 4 条', '批量+回写', function () {
        resetAllState();
        setStepLog('currency','⏳ bulkApproveAndWriteBackRates 一键闭环 (4币种)');
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        const b = c.bulkApproveAndWriteBackRates(null,'op');
        assertSuccess(b); assertEqual(b.approved, 4); assertEqual(b.written, 4);
        assertFalse(c.getIsUsingFallbackRates());
        setFlowNode('currency','approved','done'); setFlowNode('currency','written','done');
        setStepLog('currency','✓ 一键批量闭环：4 币种全部 Written');
      });
      it('Approved 重复 approve 非法流转', '边界拦截', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.approveRateReview('USD','a');
        assertFalse(c.approveRateReview('USD','b').success);
      });
      it('Rejected 重复 reject 非法流转', '边界拦截', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.rejectRateReview('USD','a');
        assertFalse(c.rejectRateReview('USD','a').success);
      });
      it('不存在货币操作 Record not found', '边界', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        assertInclude(c.approveRateReview('USD').error, 'Record not found');
      });
      it('updateProposedRate 非法值拦截', '0/负数/NaN', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        assertFalse(c.updateProposedRate('USD', 0).success);
        assertFalse(c.updateProposedRate('USD', -0.1).success);
      });
      it('syncLiveRates 成功 + 自动审核记录', 'Mock API', async function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        const r = await c.syncLiveRates();
        assertSuccess(r); assertTrue(r.isFallback);
        assertNotNull(c.getLastSyncTime());
        assertTrue(c.getAllRateReviewRecords().length >= 4);
      });
      it('getAllRateReviewRecords 筛选 approved', '状态筛选', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks();
        c.approveRateReview('USD','a'); c.approveRateReview('EUR','a');
        assertEqual(c.getAllRateReviewRecords({status:'approved'}).length, 2);
      });
    });

    // ===== Suite 7: Store 层集成联合切换闭环 (6 用例) =====
    describe('Suite 7: Store 层集成联合切换闭环', function () {
      it('useStore 初始化成功', 'isInitialized=true', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        assertTrue(s.isInitialized());
      });
      it('changeLanguage + 版本递增', '版本联动', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        const v1 = s.getVersion();
        s.changeLanguage('en-US');
        const v2 = s.getVersion();
        assertTrue(v2.i18n > v1.i18n || v2.store > v1.store);
      });
      it('changeCurrency + 版本递增', '币种版本联动', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        const v1 = s.getVersion();
        s.changeCurrency('USD');
        assertTrue(s.getVersion().currency > v1.currency);
      });
      it('课程中文+人民币格式化', 'zh-CN + CNY', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        s.changeLanguage('zh-CN'); s.changeCurrency('CNY');
        const cs = s.getCoursesWithFormattedPrices();
        assertEqual(cs.length, 4);
        assertEqual(cs[0].name, 'Python 编程入门');
        assertInclude(cs[0].priceFormatted, '¥'); assertInclude(cs[0].priceFormatted, '299');
      });
      it('课程英文+美元格式化', 'en-US + USD', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        s.changeLanguage('en-US'); s.changeCurrency('USD');
        const cs = s.getCoursesWithFormattedPrices();
        assertEqual(cs[0].name, 'Python Programming Basics');
        assertInclude(cs[0].priceFormatted, '$');
        assertClose(cs[0].priceConverted, 41.86, 0.1);
      });
      it('课程日语+日元综合联动', 'ja-JP + JPY + 回退触发', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        s.changeLanguage('ja-JP'); s.changeCurrency('JPY');
        const cs = s.getCoursesWithFormattedPrices();
        assertEqual(cs[0].name, 'Python 编程入门');
        assertClose(cs[0].priceConverted, 6279);
        assertEqual(s.getI18n().t('demo.desc_3'), 'Missing in Japanese, should fallback to English, then Chinese');
      });
    });

    // ===== Suite 8: 边界与异常场景 (12 用例) =====
    describe('Suite 8: 边界与异常场景', function () {
      it('i18n 版本号单调递增', 'bumpVersion', function () {
        resetAllState();
        const i = window.useI18n();
        const v0 = i.getVersion(); i.setLang('en-US');
        const v1 = i.getVersion(); assertTrue(v1 > v0);
        i.setLang('ja-JP'); assertTrue(i.getVersion() > v1);
      });
      it('currency 版本号单调递增', '每次操作递增', function () {
        resetAllState();
        const c = window.useCurrency();
        const v0 = c.getVersion(); c.setCurrency('USD');
        assertTrue(c.getVersion() > v0);
        c.setCustomRate('EUR', 0.12); assertTrue(c.getVersion() > v0 + 1);
      });
      it('t() 多参数插值 (validation.price_range)', '多占位符', function () {
        resetAllState();
        const i = window.useI18n(); i.setLang('zh-CN');
        assertEqual(i.t('validation.price_range',{min:'10',max:'10000'}), '价格必须在10到10000之间');
      });
      it('en-US 参数插值 (min_length)', '英文模板', function () {
        resetAllState();
        const i = window.useI18n(); i.setLang('en-US');
        assertEqual(i.t('validation.min_length',{field:'Password',min:'8'}), 'Password must be at least 8 characters');
      });
      it('batchTranslate Mock API 成功', '异步批量翻译', async function () {
        resetAllState();
        const i = window.useI18n(); i.setLang('ja-JP');
        i.t('demo.fallback_notice');
        const r = await i.batchTranslate('ja-JP', ['demo.fallback_notice','demo.fallback_rate']);
        assertSuccess(r); assertNotNull(r.translations);
      });
      it('Dashboard 币种联动格式化', 'dashboard 数据联动', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        s.changeCurrency('CNY');
        assertInclude(s.getDashboardStats().totalRevenueFormatted, '¥');
        s.changeCurrency('USD');
        assertInclude(s.getDashboardStats().totalRevenueFormatted, '$');
      });
      it('文案审核 history 累积', '每条操作 push', function () {
        resetAllState();
        const i = window.useI18n(); i.setLang('ja-JP');
        i.t('validation.name_required');
        assertEqual(i.getReviewRecord('ja-JP','validation.name_required').history.length, 1);
        i.updateProposedValue('ja-JP','validation.name_required','名前必須');
        assertEqual(i.getReviewRecord('ja-JP','validation.name_required').history.length, 2);
        i.approveReview('ja-JP','validation.name_required','a');
        assertEqual(i.getReviewRecord('ja-JP','validation.name_required').history.length, 3);
      });
      it('汇率审核 history 累积', '操作历史', function () {
        resetAllState();
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks('USD');
        assertEqual(c.getRateReviewRecord('USD').history.length, 1);
        c.updateProposedRate('USD', 0.143);
        assertEqual(c.getRateReviewRecord('USD').history.length, 2);
        c.approveRateReview('USD','a');
        assertEqual(c.getRateReviewRecord('USD').history.length, 3);
      });
      it('syncSystem 联合异步同步', 'store.syncSystem', async function () {
        resetAllState();
        const s = window.useStore(); s.init();
        const r = await s.syncSystem();
        assertSuccess(r); assertSuccess(r.rateSync);
      });
      it('E2E 文案完整闭环 + 再次 t() 命中', 'demo.sync_success', function () {
        resetAllState();
        setStepLog('i18n','⏳ E2E 文案闭环 Pending→Approved→Written→t()命中');
        const i = window.useI18n(); i.setLang('ja-JP');
        i.t('demo.sync_success');
        i.updateProposedValue('ja-JP','demo.sync_success','同期完了・データ更新済み');
        i.approveReview('ja-JP','demo.sync_success','e2e_a');
        i.writeBackApproved('ja-JP','demo.sync_success');
        assertEqual(i.getReviewRecord('ja-JP','demo.sync_success').status, 'written');
        assertEqual(i.t('demo.sync_success'), '同期完了・データ更新済み');
        setFlowNode('i18n','written','done');
        setStepLog('i18n','✓ E2E 文案闭环通过：写入值直接命中 ja-JP');
      });
      it('E2E 汇率完整闭环 + 实际换算生效 (EUR)', 'EUR=0.135', function () {
        resetAllState();
        setStepLog('currency','⏳ E2E 汇率闭环 + 换算生效');
        const c = window.useCurrency(); c.clearRateReviewStore();
        c.triggerRateReviewForFallbacks('EUR');
        c.updateProposedRate('EUR', 0.135);
        c.approveRateReview('EUR','e2e_fx');
        c.writeBackApprovedRate('EUR');
        assertEqual(c.getRateReviewRecord('EUR').status, 'written');
        assertClose(c.convert(1000,'CNY','EUR').result, 135);
        setFlowNode('currency','written','done');
        setStepLog('currency','✓ E2E 汇率闭环通过：1000 CNY = 135 EUR');
      });
      it('resetAllStore 清除 + 重新初始化', '清洁度', function () {
        resetAllState();
        const s = window.useStore(); s.init();
        s.changeLanguage('ja-JP'); s.changeCurrency('EUR');
        s.getI18n().t('demo.desc_3');
        assertTrue(s.getI18n().getAllReviewRecords().length > 0);
        s.resetAllStore();
        assertEqual(s.getCurrentLanguage(), 'zh-CN');
        assertEqual(s.getCurrentCurrency(), 'CNY');
        assertEqual(s.getI18n().getAllReviewRecords().length, 0);
      });
    });
  }

  // =====================================================
  // 全局入口
  // =====================================================
  window.runAllTests = async function () {
    registerTests();
    try { localStorage.clear(); } catch (e) {}
    const totalCases = TestRunner.suites.reduce((a, s) => a + s.cases.length, 0);
    console.log('[TestRunner] 开始执行 ' + TestRunner.suites.length + ' 套件, ' + totalCases + ' 用例');
    updateStats(0, 0, 0);
    ['fallback','pending','approved','rejected','written'].forEach(n => {
      setFlowNode('i18n', n, null); setFlowNode('currency', n, null);
    });
    setStepLog('i18n', '开始执行...'); setStepLog('currency', '开始执行...');
    const results = await TestRunner.runAll(handleProgress);
    console.log('[TestRunner] 完成: total=' + results.total + ' pass=' + results.pass + ' fail=' + results.fail + ' duration=' + results.duration + 'ms');
    return results;
  };

  // 自动注册但不自动运行
  registerTests();
  document.addEventListener('DOMContentLoaded', function () {
    updateStats(TestRunner.suites.reduce((a,s) => a + s.cases.length, 0), 0, 0);
    const c = document.getElementById('suitesContainer');
    if (c) TestRunner.render(c);
  });
})();
