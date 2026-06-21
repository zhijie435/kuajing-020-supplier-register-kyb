(function () {
  'use strict';

  // =====================================================
  // Mock Fetch API - 拦截所有后端请求，返回模拟数据
  // =====================================================
  const mockDb = {
    records: [],
    nextId: 1,
    reset: function () {
      this.records = [];
      this.nextId = 1;
    }
  };

  function kybStatusText(status) {
    const map = { 0: '待审核', 1: '审核通过', 2: '审核拒绝' };
    return map[status] ?? '未知';
  }

  function buildFullAddress(rec) {
    return (rec.registered_address_province || '') +
           (rec.registered_address_city || '') +
           (rec.registered_address_district || '') +
           (rec.registered_address_detail || '');
  }

  function validateCreditCode(code) {
    return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(code.toUpperCase());
  }

  function validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  function validateEmail(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function formatRecord(rec) {
    const r = JSON.parse(JSON.stringify(rec));
    if (r.other_certificates && typeof r.other_certificates === 'string') {
      try { r.other_certificates = JSON.parse(r.other_certificates); } catch (e) { r.other_certificates = []; }
    } else if (!r.other_certificates) {
      r.other_certificates = [];
    }
    r.full_address = buildFullAddress(r);
    r.status_text = kybStatusText(r.status);
    r.can_edit = r.status !== 1;
    return r;
  }

  window.fetch = async function (url, options) {
    url = String(url);
    options = options || {};
    const method = (options.method || 'GET').toUpperCase();

    await new Promise(r => setTimeout(r, 10));

    try {
      // ================ register.php ================
      if (url.includes('register.php')) {
        if (method !== 'POST') {
          return mockResponse({ code: 405, message: '请求方法不允许' });
        }
        const input = typeof options.body === 'string' ? JSON.parse(options.body) : {};

        const requiredFields = ['company_name', 'unified_social_credit_code', 'legal_person', 'contact_name', 'contact_phone'];
        for (const f of requiredFields) {
          if (!input[f] || !String(input[f]).trim()) {
            return mockResponse({ code: 400, message: '请填写完整的必填项：' + f });
          }
        }
        if (!validateCreditCode(input.unified_social_credit_code)) {
          return mockResponse({ code: 400, message: '统一社会信用代码格式不正确' });
        }
        if (!validatePhone(input.contact_phone)) {
          return mockResponse({ code: 400, message: '联系电话格式不正确' });
        }
        if (!validateEmail(input.contact_email)) {
          return mockResponse({ code: 400, message: '邮箱格式不正确' });
        }

        const creditCode = String(input.unified_social_credit_code).toUpperCase();
        const existing = mockDb.records.find(r => r.unified_social_credit_code === creditCode);

        if (existing && existing.status === 1) {
          return mockResponse({ code: 400, message: '该企业已通过审核，无需重复提交' });
        }

        let record;
        let isNew;
        if (existing) {
          record = Object.assign(existing, {
            company_name: input.company_name,
            legal_person: input.legal_person,
            legal_person_id_card: input.legal_person_id_card || null,
            registered_capital: input.registered_capital || null,
            establish_date: input.establish_date || null,
            business_scope: input.business_scope || null,
            registered_address_province: input.registered_address_province || null,
            registered_address_city: input.registered_address_city || null,
            registered_address_district: input.registered_address_district || null,
            registered_address_detail: input.registered_address_detail || null,
            contact_name: input.contact_name,
            contact_phone: input.contact_phone,
            contact_email: input.contact_email || null,
            business_license: input.business_license || null,
            legal_person_id_front: input.legal_person_id_front || null,
            legal_person_id_back: input.legal_person_id_back || null,
            other_certificates: JSON.stringify(input.other_certificates || []),
            status: 0,
            remark: null,
            updated_at: new Date().toISOString()
          });
          isNew = false;
        } else {
          record = {
            id: mockDb.nextId++,
            company_name: input.company_name,
            unified_social_credit_code: creditCode,
            legal_person: input.legal_person,
            legal_person_id_card: input.legal_person_id_card || null,
            registered_capital: input.registered_capital || null,
            establish_date: input.establish_date || null,
            business_scope: input.business_scope || null,
            registered_address_province: input.registered_address_province || null,
            registered_address_city: input.registered_address_city || null,
            registered_address_district: input.registered_address_district || null,
            registered_address_detail: input.registered_address_detail || null,
            contact_name: input.contact_name,
            contact_phone: input.contact_phone,
            contact_email: input.contact_email || null,
            business_license: input.business_license || null,
            legal_person_id_front: input.legal_person_id_front || null,
            legal_person_id_back: input.legal_person_id_back || null,
            other_certificates: JSON.stringify(input.other_certificates || []),
            status: 0,
            remark: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockDb.records.push(record);
          isNew = true;
        }

        const formatted = formatRecord(record);
        formatted.is_new = isNew;
        return mockResponse({
          code: 200,
          message: isNew ? '注册提交成功，请等待审核' : '资料已更新，重新进入审核队列',
          data: formatted
        });
      }

      // ================ review.php ================
      if (url.includes('review.php')) {
        if (method !== 'POST') {
          return mockResponse({ code: 405, message: '请求方法不允许' });
        }
        const input = typeof options.body === 'string' ? JSON.parse(options.body) : {};
        const id = parseInt(input.id) || 0;
        const status = parseInt(input.status);
        const remark = input.remark || '';

        if (id <= 0) return mockResponse({ code: 400, message: '无效的ID' });
        if (![1, 2].includes(status)) return mockResponse({ code: 400, message: '审核状态值无效，仅支持 1(通过) 或 2(拒绝)' });

        const record = mockDb.records.find(r => r.id === id);
        if (!record) return mockResponse({ code: 404, message: '记录不存在' });
        if (record.status !== 0) {
          return mockResponse({ code: 400, message: '该记录已完成审核（当前状态：' + kybStatusText(record.status) + '），不能重复审核' });
        }

        if (status === 1) {
          const missing = [];
          if (!record.business_license) missing.push('营业执照');
          if (!record.legal_person_id_front) missing.push('法人身份证正面');
          if (!record.legal_person_id_back) missing.push('法人身份证反面');
          if (missing.length > 0) {
            return mockResponse({ code: 400, message: '证照上传不完整，缺少：' + missing.join('、') + '。请确保证照全部上传后再审核通过。' });
          }
        }

        record.status = status;
        record.remark = remark;
        record.updated_at = new Date().toISOString();

        return mockResponse({
          code: 200,
          message: '审核操作成功，状态已回写',
          data: formatRecord(record)
        });
      }

      // ================ detail.php ================
      if (url.includes('detail.php')) {
        const idParam = url.split('id=')[1];
        const id = parseInt(idParam) || 0;
        if (id <= 0) return mockResponse({ code: 400, message: '无效的ID' });
        const record = mockDb.records.find(r => r.id === id);
        if (!record) return mockResponse({ code: 404, message: '记录不存在' });
        const formatted = formatRecord(record);
        formatted.can_view = true;
        formatted.can_review = true;
        formatted.current_role = 'admin';
        return mockResponse({ code: 200, message: '查询成功', data: formatted });
      }

      // ================ list.php ================
      if (url.includes('list.php')) {
        const urlObj = new URL(url, 'http://localhost');
        const statusFilter = urlObj.searchParams.get('status');
        const keyword = urlObj.searchParams.get('keyword') || '';
        let list = mockDb.records.map(r => ({
          id: r.id,
          company_name: r.company_name,
          unified_social_credit_code: r.unified_social_credit_code,
          legal_person: r.legal_person,
          contact_name: r.contact_name,
          contact_phone: r.contact_phone,
          status: r.status,
          status_text: kybStatusText(r.status),
          remark: r.remark,
          created_at: r.created_at,
          updated_at: r.updated_at,
          can_view: true,
          can_edit: r.status !== 1
        }));
        if (statusFilter !== null && statusFilter !== '') {
          const s = parseInt(statusFilter);
          list = list.filter(r => r.status === s);
        }
        if (keyword) {
          const kw = keyword.toLowerCase();
          list = list.filter(r =>
            r.company_name.toLowerCase().includes(kw) ||
            r.unified_social_credit_code.toLowerCase().includes(kw) ||
            r.contact_name.toLowerCase().includes(kw)
          );
        }
        list.sort((a, b) => b.id - a.id);
        return mockResponse({
          code: 200,
          message: '查询成功',
          data: {
            list: list,
            pagination: { page: 1, pageSize: 10, total: list.length, totalPages: list.length > 0 ? 1 : 0 },
            meta: { can_review: true, current_role: 'admin' }
          }
        });
      }

      // ================ upload.php ================
      if (url.includes('upload.php')) {
        if (method !== 'POST') {
          return mockResponse({ code: 405, message: '请求方法不允许' });
        }
        const fd = options.body;
        if (!(fd instanceof FormData)) {
          return mockResponse({ code: 400, message: '请上传有效的文件' });
        }
        const file = fd.get('file');
        const type = fd.get('type') || 'other';
        if (!file) return mockResponse({ code: 400, message: '请上传有效的文件' });

        const allowedTypes = ['business_license', 'legal_person_id_front', 'legal_person_id_back', 'other'];
        const safeType = allowedTypes.includes(type) ? type : 'other';

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) return mockResponse({ code: 400, message: '文件大小不能超过 10MB' });
        if (file.size <= 0) return mockResponse({ code: 400, message: '文件内容为空' });

        const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!allowedExts.includes(ext)) {
          return mockResponse({ code: 400, message: '不支持的文件扩展名，仅支持 JPG、PNG、GIF、PDF' });
        }

        const mockUrl = 'backend/uploads/' + safeType + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        return mockResponse({
          code: 200,
          message: '上传成功',
          data: { url: mockUrl, name: file.name, size: file.size, type: file.type, extension: ext }
        });
      }

      return mockResponse({ code: -1, message: 'Unknown endpoint' }, 404);
    } catch (e) {
      return mockResponse({ code: -1, message: e.message }, 500);
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
  function assertInclude(str, sub, msg) {
    if (!(typeof str === 'string' && str.includes(String(sub))))
      throw new Error((msg || 'AssertInclude failed') + ' — expected "' + sub + '" in "' + str + '"');
  }
  function assertSuccess(r, msg) { assertTrue(r && (r.code === 200 || r.success), msg || ('Expected success, got ' + JSON.stringify(r))); }
  function assertFail(r, msg) { assertTrue(r && r.code !== 200, msg || ('Expected failure, got ' + JSON.stringify(r))); }

  // =====================================================
  // 工具函数
  // =====================================================
  function validFormData(overrides) {
    const base = {
      company_name: '测试科技有限公司',
      unified_social_credit_code: '91110108MA01ABCD23',
      legal_person: '张法定',
      legal_person_id_card: '110101199001011234',
      registered_capital: '500万元',
      establish_date: '2020-01-15',
      business_scope: '技术开发、技术服务',
      registered_address_province: '北京市',
      registered_address_city: '北京市',
      registered_address_district: '海淀区',
      registered_address_detail: '中关村大街1号',
      contact_name: '李联系',
      contact_phone: '13800138001',
      contact_email: 'contact@example.com',
      business_license: 'https://example.com/license.jpg',
      legal_person_id_front: 'https://example.com/id_front.jpg',
      legal_person_id_back: 'https://example.com/id_back.jpg',
      other_certificates: []
    };
    return Object.assign({}, base, overrides || {});
  }

  function setFlowNode(nodeName, state) {
    const d = document.getElementById('flowKyb');
    if (!d) return;
    const n = d.querySelector('[data-node="' + nodeName + '"]');
    if (!n) return;
    n.classList.remove('current', 'done');
    if (state) n.classList.add(state);
  }

  function setStepLog(text) {
    const el = document.getElementById('kybStepLog');
    if (el) el.textContent = text;
  }

  function updateStats(total, pass, fail) {
    const rate = total > 0 ? ((pass / total) * 100).toFixed(1) + '%' : '—';
    ['statTotal', 'statPass', 'statFail', 'statRate'].forEach(i => {
      const el = document.getElementById(i);
      if (!el) return;
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
    TestRunner.suites = [];
    TestRunner.currentSuite = null;
    const describe = TestRunner.describe.bind(TestRunner);
    const it = TestRunner.it.bind(TestRunner);

    // ===== Suite 1: 企业资料表单验证 =====
    describe('Suite 1: 企业资料表单验证（注册接口）', function () {
      it('提交完整有效数据 - 创建新记录', 'status=0 待审核', async function () {
        mockDb.reset();
        const data = validFormData();
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 0);
        assertEqual(r.data.status_text, '待审核');
        assertTrue(r.data.is_new);
        assertTrue(r.data.can_edit);
        assertNotNull(r.data.id);
      });

      it('缺少企业名称 - 400错误', '必填项校验', async function () {
        mockDb.reset();
        const data = validFormData({ company_name: '' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertEqual(r.code, 400);
        assertInclude(r.message, '企业名称');
      });

      it('缺少统一社会信用代码 - 400错误', '必填项校验', async function () {
        mockDb.reset();
        const data = validFormData({ unified_social_credit_code: '' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '统一社会信用代码');
      });

      it('统一社会信用代码格式错误 - 400错误', '正则校验', async function () {
        mockDb.reset();
        const data = validFormData({ unified_social_credit_code: '123456' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '格式不正确');
      });

      it('联系电话格式错误 - 400错误', '手机号正则', async function () {
        mockDb.reset();
        const data = validFormData({ contact_phone: '123456' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '联系电话格式不正确');
      });

      it('联系电话不是1开头11位 - 400错误', '1[3-9]xxxxxxxxx', async function () {
        mockDb.reset();
        const data = validFormData({ contact_phone: '23800138001' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
      });

      it('邮箱格式错误 - 400错误', 'email正则', async function () {
        mockDb.reset();
        const data = validFormData({ contact_email: 'not-an-email' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '邮箱格式不正确');
      });

      it('邮箱可选，不填也能通过', '邮箱非必填', async function () {
        mockDb.reset();
        const data = validFormData({ contact_email: '' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertSuccess(r);
      });

      it('缺少法定代表人 - 400错误', '必填项校验', async function () {
        mockDb.reset();
        const data = validFormData({ legal_person: '' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '法定代表人');
      });

      it('缺少联系人 - 400错误', '必填项校验', async function () {
        mockDb.reset();
        const data = validFormData({ contact_name: '' });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '联系人');
      });

      it('统一社会信用代码自动转大写', '归一化处理', async function () {
        mockDb.reset();
        const lowercaseCode = '91110108ma01abcd23';
        const data = validFormData({ unified_social_credit_code: lowercaseCode });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.unified_social_credit_code, '91110108MA01ABCD23');
      });
    });

    // ===== Suite 2: 证照上传验证 =====
    describe('Suite 2: 证照上传验证', function () {
      it('营业执照上传 - JPG格式成功', '上传接口', async function () {
        const fd = new FormData();
        const file = new File(['fake-image-content'], 'license.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 102400 });
        fd.append('file', file);
        fd.append('type', 'business_license');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertSuccess(r);
        assertNotNull(r.data.url);
        assertInclude(r.data.url, 'business_license');
      });

      it('身份证正面上传 - PNG格式成功', '身份证正面', async function () {
        const fd = new FormData();
        const file = new File(['fake-png-content'], 'id_front.png', { type: 'image/png' });
        Object.defineProperty(file, 'size', { value: 204800 });
        fd.append('file', file);
        fd.append('type', 'legal_person_id_front');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertSuccess(r);
        assertInclude(r.data.url, 'legal_person_id_front');
      });

      it('身份证反面上传 - PDF格式成功', '身份证反面 PDF', async function () {
        const fd = new FormData();
        const file = new File(['fake-pdf-content'], 'id_back.pdf', { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 512000 });
        fd.append('file', file);
        fd.append('type', 'legal_person_id_back');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertSuccess(r);
      });

      it('上传文件超过10MB - 400错误', '大小限制', async function () {
        const fd = new FormData();
        const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
        fd.append('file', file);
        fd.append('type', 'business_license');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '10MB');
      });

      it('上传不支持的扩展名 - 400错误', '扩展名限制', async function () {
        const fd = new FormData();
        const file = new File(['fake'], 'test.exe', { type: 'application/exe' });
        Object.defineProperty(file, 'size', { value: 1024 });
        fd.append('file', file);
        fd.append('type', 'other');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '不支持');
      });

      it('其他证照上传成功', 'other类型', async function () {
        const fd = new FormData();
        const file = new File(['iso-cert'], 'iso9001.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 200000 });
        fd.append('file', file);
        fd.append('type', 'other');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertSuccess(r);
        assertInclude(r.data.url, 'other_');
      });

      it('不提供文件 - 400错误', '无文件提交', async function () {
        const fd = new FormData();
        fd.append('type', 'business_license');
        const r = await fetch('upload.php', { method: 'POST', body: fd }).then(r => r.json());
        assertFail(r);
      });
    });

    // ===== Suite 3: 状态流转闭环核心 - 新建→审核 =====
    describe('Suite 3: 状态流转闭环 - 新建与审核', function () {
      it('新提交记录初始状态为 待审核(0)', '初始化状态', async function () {
        mockDb.reset();
        setFlowNode('submit', 'current');
        setStepLog('⏳ 提交新注册 → 初始状态待审核');
        const data = validFormData();
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 0);
        assertEqual(r.data.status_text, '待审核');
        assertTrue(r.data.can_edit);
        setFlowNode('submit', 'done');
        setFlowNode('pending', 'current');
        setStepLog('✓ 新记录创建成功，状态 = 待审核(0)');
      });

      it('审核通过 - Pending(0) → Approved(1)', '审核通过流转', async function () {
        mockDb.reset();
        setFlowNode('pending', 'current');
        setStepLog('⏳ 待审核 → 审核通过');
        const sub = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const id = sub.data.id;
        const r = await fetch('review.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, status: 1, remark: '资质齐全' })
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 1);
        assertEqual(r.data.status_text, '审核通过');
        assertFalse(r.data.can_edit);
        assertEqual(r.data.remark, '资质齐全');
        setFlowNode('pending', 'done');
        setFlowNode('approved', 'current');
        setStepLog('✓ Pending(0) → Approved(1) 流转成功');
      });

      it('审核拒绝 - Pending(0) → Rejected(2)', '审核拒绝流转', async function () {
        mockDb.reset();
        setFlowNode('pending', 'current');
        setStepLog('⏳ 待审核 → 审核拒绝');
        const sub = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const id = sub.data.id;
        const r = await fetch('review.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, status: 2, remark: '营业执照模糊，请重新上传' })
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 2);
        assertEqual(r.data.status_text, '审核拒绝');
        assertTrue(r.data.can_edit);
        setFlowNode('pending', 'done');
        setFlowNode('rejected', 'current');
        setStepLog('✓ Pending(0) → Rejected(2) 流转成功');
      });

      it('审核通过后 can_edit=false', '终态不可修改', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertFalse(r.data.can_edit);
      });

      it('审核拒绝后 can_edit=true', '拒绝后可修改', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 2 })
        }).then(r => r.json());
        assertTrue(r.data.can_edit);
      });
    });

    // ===== Suite 4: 状态闭环 - 拒绝后重新提交 =====
    describe('Suite 4: 状态闭环 - 拒绝后重新提交', function () {
      it('拒绝后重新提交 - Rejected(2) → Pending(0)', '二次审核触发', async function () {
        mockDb.reset();
        setFlowNode('rejected', 'current');
        setStepLog('⏳ 审核拒绝 → 修改资料重新提交');

        const sub = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const id = sub.data.id;
        const creditCode = sub.data.unified_social_credit_code;

        await fetch('review.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, status: 2, remark: '资料不全' })
        });

        const updated = validFormData({
          unified_social_credit_code: creditCode,
          company_name: '测试科技有限公司（已更新）',
          remark: null
        });
        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 0);
        assertEqual(r.data.status_text, '待审核');
        assertEqual(r.data.company_name, '测试科技有限公司（已更新）');
        assertNull(r.data.remark);
        assertFalse(r.data.is_new);
        setFlowNode('rejected', 'done');
        setFlowNode('pending', 'current');
        setStepLog('✓ Rejected(2) → Pending(0) 成功，remark清空，重新进入审核');
      });

      it('重新提交后 remark 被清空', 'remark重置', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const creditCode = sub.data.unified_social_credit_code;

        await fetch('review.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 2, remark: '这是拒绝原因' })
        });

        const r = await fetch('register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData({ unified_social_credit_code: creditCode }))
        }).then(r => r.json());
        assertNull(r.data.remark);
      });

      it('完整闭环：提交→拒绝→重提→通过', 'E2E四态流转', async function () {
        mockDb.reset();
        setStepLog('⏳ E2E完整闭环：Pending→Rejected→Pending→Approved');

        const sub1 = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        assertEqual(sub1.data.status, 0);
        const creditCode = sub1.data.unified_social_credit_code;

        const rej = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub1.data.id, status: 2, remark: '需要补充资料' })
        }).then(r => r.json());
        assertEqual(rej.data.status, 2);

        const sub2 = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData({ unified_social_credit_code: creditCode }))
        }).then(r => r.json());
        assertEqual(sub2.data.status, 0);

        const appr = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub2.data.id, status: 1, remark: 'OK' })
        }).then(r => r.json());
        assertEqual(appr.data.status, 1);
        assertFalse(appr.data.can_edit);

        setFlowNode('approved', 'current');
        setStepLog('✓ E2E完整闭环通过：状态 0→2→0→1');
      });
    });

    // ===== Suite 5: 终态保护 - 已通过不可修改 =====
    describe('Suite 5: 终态保护 - 已通过不可修改/重复审核', function () {
      it('已通过记录重新提交 - 400拦截', '终态保护', async function () {
        mockDb.reset();
        setFlowNode('approved', 'current');
        setStepLog('⏳ 已通过状态保护测试');
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        const creditCode = sub.data.unified_social_credit_code;

        await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        });

        const r = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData({ unified_social_credit_code: creditCode }))
        }).then(r => r.json());
        assertFail(r);
        assertEqual(r.code, 400);
        assertInclude(r.message, '已通过审核');
        setStepLog('✓ 终态保护：已通过记录禁止重新提交');
      });

      it('已通过记录重复审核通过 - 400拦截', '重复审核拦截', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        });
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '已完成审核');
      });

      it('已通过记录尝试审核拒绝 - 400拦截', '终态反向拦截', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        });
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 2 })
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '已完成审核');
      });

      it('已拒绝记录重复拒绝 - 400拦截', '拒绝态保护', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData())
        }).then(r => r.json());
        await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 2 })
        });
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 2 })
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '已完成审核');
      });
    });

    // ===== Suite 6: 审核通过 - 证照完整性校验 =====
    describe('Suite 6: 审核通过 - 证照完整性校验', function () {
      it('缺少营业执照 - 审核通过被拦截', '营业执照必填', async function () {
        mockDb.reset();
        setStepLog('⏳ 证照完整性：缺少营业执照审核拦截');
        const data = validFormData({ business_license: '' });
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertFail(r);
        assertEqual(r.code, 400);
        assertInclude(r.message, '营业执照');
        assertInclude(r.message, '证照上传不完整');
      });

      it('缺少身份证正面 - 审核通过被拦截', '身份证正面必填', async function () {
        mockDb.reset();
        const data = validFormData({ legal_person_id_front: '' });
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '法人身份证正面');
      });

      it('缺少身份证反面 - 审核通过被拦截', '身份证反面必填', async function () {
        mockDb.reset();
        const data = validFormData({ legal_person_id_back: '' });
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '法人身份证反面');
      });

      it('三张证照齐全 - 审核通过成功', '证照完整通过', async function () {
        mockDb.reset();
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFormData({
            business_license: 'url_a',
            legal_person_id_front: 'url_b',
            legal_person_id_back: 'url_c'
          }))
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 1);
      });

      it('缺少证照 - 审核拒绝可以通过', '拒绝不校验证照', async function () {
        mockDb.reset();
        const data = validFormData({
          business_license: '',
          legal_person_id_front: '',
          legal_person_id_back: ''
        });
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 2, remark: '证照全部缺失' })
        }).then(r => r.json());
        assertSuccess(r);
        assertEqual(r.data.status, 2);
      });

      it('缺少营业执照+身份证反面 - 审核拦截列出全部缺失', '多个缺失提示', async function () {
        mockDb.reset();
        const data = validFormData({ business_license: '', legal_person_id_back: '' });
        const sub = await fetch('register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json());
        const r = await fetch('review.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sub.data.id, status: 1 })
        }).then(r => r.json());
        assertFail(r);
        assertInclude(r.message, '营业执照');
        assertInclude(r.message, '法人身份证反面');
      });
    });

    // ===== Suite 7: 审核接口边界校验 =====
    describe('Suite 7: 审核接口边界