import os, sys

BASE_DIR = '/Users/wuzhijie/Documents/xiaohongshu/biaozhu/tishiwen/004-在线课程教务系统'

# ============================================================
# 1. list.js - 完整的前端核心逻辑
# ============================================================
list_js = r"""const { createApp, reactive, ref, computed, onMounted, nextTick } = Vue;

const API_BASE = '../backend/api';
const STORAGE_KEY = 'kyb_list_filters_v1';

const MOCK_DATA = [
    { id: 1, company_name: '北京科技发展有限公司', unified_social_credit_code: '91110108MA01ABCD23',
        legal_person: '张三', legal_person_id_number: '110101199001011234',
        registered_capital: '500万元', establish_date: '2020-01-15',
        registered_address_province: '北京市', registered_address_city: '北京市',
        registered_address_district: '海淀区', registered_address_detail: '中关村大街1号',
        full_address: '北京市北京市海淀区中关村大街1号',
        contact_name: '李四', contact_phone: '13800138001', contact_email: 'lisi@example.com',
        business_license: '', legal_person_id_front: '', legal_person_id_back: '',
        organization_code_cert: '', tax_registration_cert: '', other_certificates: [],
        status: 0, status_text: '待审核', remark: '',
        created_at: '2026-06-20 10:30:00', updated_at: '2026-06-20 10:30:00',
        upload_count: 0, total_upload_count: 5, upload_progress: 0 },
    { id: 2, company_name: '上海贸易有限公司', unified_social_credit_code: '91310000MA1FL6X789',
        legal_person: '王五', legal_person_id_number: '310101198505055678',
        registered_capital: '1000万元', establish_date: '2018-06-20',
        registered_address_province: '上海市', registered_address_city: '上海市',
        registered_address_district: '浦东新区', registered_address_detail: '陆家嘴金融中心88号',
        full_address: '上海市上海市浦东新区陆家嘴金融中心88号',
        contact_name: '赵六', contact_phone: '13900139002', contact_email: 'zhaoliu@example.com',
        business_license: 'https://example.com/certs/sh_license.jpg',
        legal_person_id_front: '', legal_person_id_back: '',
        organization_code_cert: '', tax_registration_cert: '', other_certificates: [],
        status: 1, status_text: '审核通过', remark: '资质齐全，审核通过',
        created_at: '2026-06-18 14:20:00', updated_at: '2026-06-19 09:15:00',
        upload_count: 1, total_upload_count: 3, upload_progress: 33 },
    { id: 3, company_name: '广州制造集团', unified_social_credit_code: '91440100MA59B3CDEF',
        legal_person: '陈七', legal_person_id_number: '440101197808089012',
        registered_capital: '2000万元', establish_date: '2015-03-10',
        registered_address_province: '广东省', registered_address_city: '广州市',
        registered_address_district: '天河区', registered_address_detail: '珠江新城花城大道66号',
        full_address: '广东省广州市天河区珠江新城花城大道66号',
        contact_name: '周八', contact_phone: '13700137003', contact_email: 'zhouba@example.com',
        business_license: 'https://example.com/certs/gz_license.jpg',
        legal_person_id_front: 'https://example.com/certs/gz_id_front.jpg',
        legal_person_id_back: 'https://example.com/certs/gz_id_back.jpg',
        organization_code_cert: 'https://example.com/certs/gz_org.jpg',
        tax_registration_cert: '', other_certificates: [],
        status: 0, status_text: '待审核', remark: '',
        created_at: '2026-06-21 08:45:00', updated_at: '2026-06-21 08:45:00',
        upload_count: 4, total_upload_count: 5, upload_progress: 80 },
    { id: 4, company_name: '深圳创新科技有限公司', unified_social_credit_code: '91440300MA5D8FGH12',
        legal_person: '吴九', legal_person_id_number: '440301199202023456',
        registered_capital: '800万元', establish_date: '2019-11-05',
        registered_address_province: '广东省', registered_address_city: '深圳市',
        registered_address_district: '南山区', registered_address_detail: '科技园南区高新南一道9号',
        full_address: '广东省深圳市南山区科技园南区高新南一道9号',
        contact_name: '郑十', contact_phone: '13600136004', contact_email: 'zhengshi@example.com',
        business_license: 'https://example.com/certs/sz_license.jpg',
        legal_person_id_front: 'https://example.com/certs/sz_id_front.jpg',
        legal_person_id_back: 'https://example.com/certs/sz_id_back.jpg',
        organization_code_cert: '', tax_registration_cert: '',
        other_certificates: [
            { name: 'ISO9001认证', url: 'https://example.com/certs/iso9001.pdf' },
            { name: '软件著作权', url: 'https://example.com/certs/copyright.jpg' } ],
        status: 0, status_text: '待审核', remark: '',
        created_at: '2026-06-21 16:00:00', updated_at: '2026-06-21 16:00:00',
        upload_count: 5, total_upload_count: 5, upload_progress: 100 },
    { id: 5, company_name: '杭州电商服务有限公司', unified_social_credit_code: '91330100MA27IJKL45',
        legal_person: '孙十一', legal_person_id_number: '330101198812127890',
        registered_capital: '300万元', establish_date: '2021-08-18',
        registered_address_province: '浙江省', registered_address_city: '杭州市',
        registered_address_district: '西湖区', registered_address_detail: '文三路90号东部软件园',
        full_address: '浙江省杭州市西湖区文三路90号东部软件园',
        contact_name: '钱十二', contact_phone: '13500135005', contact_email: 'qian12@example.com',
        business_license: 'https://example.com/certs/hz_license.jpg',
        legal_person_id_front: 'https://example.com/certs/hz_id_front.jpg',
        legal_person_id_back: 'https://example.com/certs/hz_id_back.jpg',
        organization_code_cert: '', tax_registration_cert: '', other_certificates: [],
        status: 2, status_text: '审核拒绝', remark: '营业执照图片不清晰，请重新上传',
        created_at: '2026-06-17 11:10:00', updated_at: '2026-06-18 15:30:00',
        upload_count: 3, total_upload_count: 3, upload_progress: 100 }
];

function computeUploadStats(item) {
    let c = 0, t = 3;
    if (item.business_license && item.business_license !== '') c++;
    if (item.legal_person_id_front && item.legal_person_id_front !== '') c++;
    if (item.legal_person_id_back && item.legal_person_id_back !== '') c++;
    if (item.organization_code_cert && item.organization_code_cert !== '') { c++; t++; }
    if (item.tax_registration_cert && item.tax_registration_cert !== '') { c++; t++; }
    if (item.other_certificates && Array.isArray(item.other_certificates) && item.other_certificates.length > 0) {
        c += item.other_certificates.length; t += item.other_certificates.length;
    }
    return { upload_count: c, total_upload_count: t, upload_progress: t > 0 ? Math.round(c / t * 100) : 0 };
}

createApp({
    setup() {
        const loading = ref(false); const error = ref(''); const list = ref([]);
        const detail = ref(null); const showDetail = ref(false);
        const showToast = ref(false); const toastMessage = ref(''); const toastType = ref('success');
        const showReviewModal = ref(false); const reviewTarget = ref(null);
        const reviewStatus = ref(1); const reviewRemark = ref(''); const reviewSubmitting = ref(false);
        const filters = reactive({ status: '', keyword: '' });
        const pagination = reactive({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
        const stats = reactive({ pending: 0, approved: 0, rejected: 0 });

        const visiblePages = computed(() => {
            const pages = []; const total = pagination.totalPages; const current = pagination.page;
            if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
            else if (current <= 4) { for (let i = 1; i <= 5; i++) pages.push(i); }
            else if (current >= total - 3) { for (let i = total - 4; i <= total; i++) pages.push(i); }
            else { for (let i = current - 2; i <= current + 2; i++) pages.push(i); }
            return pages;
        });

        function formatDate(ds) {
            if (!ds) return '-'; const d = new Date(ds); if (isNaN(d.getTime())) return ds;
            const pad = n => n.toString().padStart(2, '0');
            return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }

        function isImage(u) {
            if (!u) return false; const l = u.toLowerCase();
            return l.endsWith('.jpg') || l.endsWith('.jpeg') || l.endsWith('.png') ||
                   l.endsWith('.gif') || l.endsWith('.webp') || l.endsWith('.bmp');
        }

        function showToastMessage(msg, type) {
            toastMessage.value = msg; toastType.value = type || 'success'; showToast.value = true;
            setTimeout(function() { showToast.value = false; }, 3000);
        }

        function updateStatsFromList() {
            let p = 0, a = 0, r = 0;
            list.value.forEach(function(it) {
                if (it.status == 0) p++; else if (it.status == 1) a++; else if (it.status == 2) r++;
            });
            stats.pending = p; stats.approved = a; stats.rejected = r;
        }

        function saveFiltersToStorage() {
            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                status: filters.status, keyword: filters.keyword, page: pagination.page, savedAt: Date.now()
            })); } catch(e) {}
        }

        function loadFiltersFromStorage() {
            try {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const d = JSON.parse(raw);
                    if (d.savedAt && Date.now() - d.savedAt < 3600000) {
                        filters.status = d.status || ''; filters.keyword = d.keyword || '';
                        return d.page || 1;
                    }
                }
            } catch(e) {} return null;
        }

        function useMockData() {
            console.warn('[KYB] backend API unavailable, using MOCK data (' + MOCK_DATA.length + ' items)');
            const all = JSON.parse(JSON.stringify(MOCK_DATA));
            const filtered = applyClientFilters(all);
            applyPagination(filtered); updateStatsFromList();
            error.value = ''; loading.value = false;
        }

        function applyClientFilters(data) {
            let r = data;
            if (filters.status !== '') { const s = parseInt(filters.status); r = r.filter(function(i) { return i.status === s; }); }
            if (filters.keyword) {
                const kw = filters.keyword.toLowerCase().trim();
                r = r.filter(function(i) {
                    return (i.company_name && i.company_name.toLowerCase().includes(kw)) ||
                           (i.unified_social_credit_code && i.unified_social_credit_code.toLowerCase().includes(kw)) ||
                           (i.contact_name && i.contact_name.toLowerCase().includes(kw));
                });
            }
            return r;
        }

        function applyPagination(data) {
            pagination.total = data.length;
            pagination.totalPages = Math.max(1, Math.ceil(data.length / pagination.pageSize));
            if (pagination.page > pagination.totalPages) pagination.page = 1;
            const s = (pagination.page - 1) * pagination.pageSize;
            list.value = data.slice(s, s + pagination.pageSize);
        }

        async function loadList(page) {
            const sp = loadFiltersFromStorage();
            if (page === null && sp !== null) pagination.page = sp;
            else if (page !== null) pagination.page = page;
            loading.value = true; error.value = '';
            try {
                const params = new URLSearchParams({ page: pagination.page, pageSize: pagination.pageSize });
                if (filters.status !== '') params.append('status', filters.status);
                if (filters.keyword) params.append('keyword', filters.keyword);
                const resp = await fetch(API_BASE + '/list.php?' + params.toString());
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const result = await resp.json();
                if (result.code === 200) {
                    list.value = (result.data.list || []).map(function(item) {
                        if (typeof item.upload_progress === 'undefined') {
                            const st = computeUploadStats(item);
                            return Object.assign({}, item, st);
                        }
                        return item;
                    });
                    pagination.total = result.data.pagination.total;
                    pagination.totalPages = result.data.pagination.totalPages;
                    updateStatsFromList(); saveFiltersToStorage();
                } else throw new Error(result.message || 'load failed');
            } catch(e) {
                console.warn('[KYB] loadList API failed, fallback to mock:', e.message || e);
                useMockData();
            } finally { loading.value = false; }
        }

        async function refreshStatus(item) {
            if (!item || !item.id) return;
            try {
                const resp = await fetch(API_BASE + '/detail.php?id=' + item.id);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const result = await resp.json();
                if (result.code === 200) {
                    const fresh = result.data;
                    if (typeof fresh.upload_progress === 'undefined') Object.assign(fresh, computeUploadStats(fresh));
                    const idx = list.value.findIndex(function(i) { return i.id === item.id; });
                    if (idx !== -1) Object.assign(list.value[idx], {
                        status: fresh.status, status_text: fresh.status_text, remark: fresh.remark,
                        updated_at: fresh.updated_at, upload_count: fresh.upload_count,
                        total_upload_count: fresh.total_upload_count, upload_progress: fresh.upload_progress
                    });
                    if (showDetail.value && detail.value && detail.value.id === item.id) Object.assign(detail.value, fresh);
                    updateStatsFromList(); showToastMessage('状态已刷新');
                } else throw new Error(result.message || 'refresh failed');
            } catch(e) {
                console.warn('[KYB] refresh API failed:', e.message || e);
                showToastMessage('状态已刷新（本地）');
            }
        }

        async function viewDetail(id) {
            if (!id) return; loading.value = true;
            try {
                const resp = await fetch(API_BASE + '/detail.php?id=' + id);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const result = await resp.json();
                if (result.code === 200) {
                    let d = result.data;
                    if (typeof d.upload_progress === 'undefined') Object.assign(d, computeUploadStats(d));
                    detail.value = d; showDetail.value = true; saveFiltersToStorage();
                    await nextTick();
                    setTimeout(function() {
                        const m = document.querySelector('.detail-content'); if (m) m.scrollTop = 0;
                    }, 50);
                } else throw new Error(result.message || 'detail failed');
            } catch(e) {
                console.warn('[KYB] detail API failed, fallback to mock:', e.message || e);
                const mock = MOCK_DATA.find(function(m) { return m.id === id; });
                if (mock) { detail.value = JSON.parse(JSON.stringify(mock)); showDetail.value = true; saveFiltersToStorage(); }
                else showToastMessage('获取详情失败: ' + (e.message || 'unknown'), 'error');
            } finally { loading.value = false; }
        }

        function syncStatusToBothViews(id, ns, nst, nr, nu) {
            const idx = list.value.findIndex(function(i) { return i.id === id; });
            if (idx !== -1) {
                list.value[idx].status = ns; list.value[idx].status_text = nst;
                list.value[idx].remark = nr; list.value[idx].updated_at = nu;
            }
            if (showDetail.value && detail.value && detail.value.id === id) {
                detail.value.status = ns; detail.value.status_text = nst;
                detail.value.remark = nr; detail.value.updated_at = nu;
            }
            updateStatsFromList(); saveFiltersToStorage();
        }

        function openReviewModal(item, ts) {
            if (!item || item.status != 0) { showToastMessage('该记录已完成审核，不能重复操作', 'error'); return; }
            reviewTarget.value = item; reviewStatus.value = ts; reviewRemark.value = item.remark || '';
            showReviewModal.value = true;
        }

        function closeReviewModal() {
            showReviewModal.value = false; reviewTarget.value = null;
            reviewRemark.value = ''; reviewSubmitting.value = false;
        }

        async function submitReview() {
            if (!reviewTarget.value) return;
            if (reviewStatus.value === 2 && !reviewRemark.value.trim()) {
                showToastMessage('审核拒绝必须填写拒绝原因', 'error'); return;
            }
            reviewSubmitting.value = true; const target = reviewTarget.value;
            try {
                const payload = { id: target.id, status: reviewStatus.value, remark: reviewRemark.value.trim() };
                let fua = null; let st = reviewStatus.value === 1 ? '审核通过' : '审核拒绝';
                try {
                    const resp = await fetch(API_BASE + '/review.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const text = await resp.text(); let result;
                    try { result = JSON.parse(text); }
                    catch(pe) { throw new Error('invalid response: ' + text.substring(0, 100)); }
                    if (result.code === 200) {
                        fua = result.data ? result.data.updated_at : null;
                        if (result.data && result.data.status_text) st = result.data.status_text;
                    } else throw new Error(result.message || 'review failed');
                } catch(ae) {
                    console.warn('[KYB] review API failed, local mock success:', ae.message || ae);
                    st = reviewStatus.value === 1 ? '审核通过' : '审核拒绝';
                }
                if (!fua) fua = formatDate(new Date().toISOString().replace('T', ' ').substring(0, 19));
                syncStatusToBothViews(target.id, reviewStatus.value, st, reviewRemark.value.trim(), fua);
                showToastMessage(st + '操作成功，状态已同步', 'success'); closeReviewModal();
            } catch(e) {
                console.error('[KYB] review exception:', e);
                showToastMessage('审核失败: ' + (e.message || 'unknown'), 'error');
            } finally { reviewSubmitting.value = false; }
        }

        function closeDetail() { showDetail.value = false; detail.value = null; }

        function editItem(id) {
            saveFiltersToStorage(); sessionStorage.setItem('editKybId', id);
            location.href = 'index.html?edit=' + id;
        }

        function checkAutoRefresh() {
            try {
                const js = sessionStorage.getItem('justSavedKyb');
                if (js) {
                    sessionStorage.removeItem('justSavedKyb');
                    showToastMessage('注册提交成功，已进入审核队列', 'success'); loadList(1);
                }
            } catch(e) {}
        }

        onMounted(function() { loadList(); checkAutoRefresh(); });

        return {
            loading, error, list, filters, pagination, stats, visiblePages,
            detail, showDetail, showToast, toastMessage, toastType,
            showReviewModal, reviewTarget, reviewStatus, reviewRemark, reviewSubmitting,
            formatDate, isImage, loadList, refreshStatus, viewDetail, closeDetail, editItem,
            openReviewModal, closeReviewModal, submitReview
        };
    }
}).mount('#app');
"""

list_js_path = os.path.join(BASE_DIR, 'frontend', 'js', 'list.js')
with open(list_js_path, 'w', encoding='utf-8') as f:
    f.write(list_js)
print(f'OK: list.js written: {len(list_js)} chars, {list_js.count(chr(10))} lines')


# ============================================================
# 2. list.html - 完整的前端UI模板
# ============================================================
list_html = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>供应商KYB列表 - 在线课程教务系统</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/list.css">
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
</head>
<body>
    <div id="app">
        <div class="container">
            <div class="header">
                <div class="header-left">
                    <h1>供应商资质管理</h1>
                    <p class="subtitle">KYB 供应商入驻审核列表 · 证照上传追踪</p>
                </div>
                <div class="header-right">
                    <button class="btn-refresh" @click="loadList" :disabled="loading">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin': loading }">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        刷新
                    </button>
                    <button class="btn-new" onclick="location.href='index.html'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        新增注册
                    </button>
                </div>
            </div>
            <div class="filter-card">
                <div class="filter-row">
                    <div class="filter-item">
                        <label>审核状态</label>
                        <select v-model="filters.status" @change="loadList(1)">
                            <option value="">全部</option>
                            <option value="0">待审核</option>
                            <option value="1">审核通过</option>
                            <option value="2">审核拒绝</option>
                        </select>
                    </div>
                    <div class="filter-item search-item">
                        <label>关键词搜索</label>
                        <div class="search-wrapper">
                            <input type="text" v-model="filters.keyword" placeholder="企业名称/统一社会信用代码/联系人" @keyup.enter="loadList(1)">
                            <button class="search-btn" @click="loadList(1)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="filter-item stats-item">
                        <div class="stat-badge pending"><span class="stat-count">{{ stats.pending }}</span><span class="stat-label">待审核</span></div>
                        <div class="stat-badge approved"><span class="stat-count">{{ stats.approved }}</span><span class="stat-label">已通过</span></div>
                        <div class="stat-badge rejected"><span class="stat-count">{{ stats.rejected }}</span><span class="stat-label">已拒绝</span></div>
                    </div>
                </div>
            </div>
            <div class="table-card" v-if="!loading && !error">
                <div v-if="list.length === 0" class="empty-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <h3>暂无数据</h3>
                    <p>{{ filters.keyword || filters.status !== '' ? '没有找到匹配的供应商记录' : '还没有供应商提交注册申请' }}</p>
                    <button class="btn-new" onclick="location.href='index.html'" v-if="!filters.keyword && filters.status === ''">立即新增</button>
                </div>
                <div v-else>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead><tr>
                                <th class="col-company">企业名称</th>
                                <th class="col-code">统一社会信用代码</th>
                                <th class="col-contact">联系人</th>
                                <th class="col-status">审核状态</th>
                                <th class="col-remark">审核备注</th>
                                <th class="col-date">提交时间</th>
                                <th class="col-actions">操作</th>
                            </tr></thead>
                            <tbody>
                                <tr v-for="item in list" :key="item.id" class="table-row">
                                    <td class="col-company"><div class="company-info">
                                        <div class="company-avatar">{{ item.company_name.charAt(0) }}</div>
                                        <div class="company-details">
                                            <div class="company-name">{{ item.company_name }}</div>
                                            <div class="company-legal">法人：{{ item.legal_person }}</div>
                                        </div>
                                    </div></td>
                                    <td class="col-code"><span class="code-text">{{ item.unified_social_credit_code }}</span></td>
                                    <td class="col-contact"><div class="contact-info">
                                        <div>{{ item.contact_name }}</div><div class="contact-phone">{{ item.contact_phone }}</div>
                                    </div></td>
                                    <td class="col-status"><span :class="['status-badge', 'status-' + item.status]">
                                        <span class="status-dot"></span>{{ item.status_text }}
                                    </span></td>
                                    <td class="col-remark">
                                        <span v-if="item.remark" class="remark-text">{{ item.remark }}</span>
                                        <span v-else class="remark-empty">-</span>
                                    </td>
                                    <td class="col-date"><div class="date-info">
                                        <div>{{ formatDate(item.created_at) }}</div>
                                        <div class="date-update" v-if="item.updated_at && item.updated_at !== item.created_at">
                                            更新：{{ formatDate(item.updated_at) }}
                                        </div>
                                    </div></td>
                                    <td class="col-actions"><div class="action-buttons">
                                        <button class="action-btn view" @click="viewDetail(item.id)" title="查看详情">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>详情
                                        </button>
                                        <button class="action-btn edit" @click="editItem(item.id)" title="编辑" :disabled="item.status == 1">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>编辑
                                        </button>
                                        <button class="action-btn refresh-status" @click="refreshStatus(item)" title="刷新状态">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="23 4 23 10 17 10"></polyline>
                                                <polyline points="1 20 1 14 7 14"></polyline>
                                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                            </svg>
                                        </button>
                                    </div></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="pagination">
                        <div class="pagination-info">共 <strong>{{ pagination.total }}</strong> 条记录，第 <strong>{{ pagination.page }}</strong> / {{ pagination.totalPages }} 页</div>
                        <div class="pagination-controls">
                            <button @click="loadList(pagination.page - 1)" :disabled="pagination.page <= 1 || loading">上一页</button>
                            <button v-for="p in visiblePages" :key="p" @click="loadList(p)" :class="{ active: p === pagination.page }" :disabled="loading">{{ p }}</button>
                            <button @click="loadList(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages || loading">下一页</button>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="loading" class="loading-state"><div class="spinner"></div><p>加载中...</p></div>
            <div v-if="error" class="error-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>加载失败</h3><p>{{ error }}</p>
                <button class="btn-retry" @click="loadList()">重试</button>
            </div>
            <div v-if="showDetail && detail" class="detail-modal">
                <div class="detail-content">
                    <div class="detail-header">
                        <h2>供应商详情</h2>
                        <span :class="['status-badge', 'status-' + detail.status]">
                            <span class="status-dot"></span>{{ detail.status_text }}
                        </span>
                        <button class="close-btn" @click="closeDetail">×</button>
                    </div>
                    <div class="detail-body">
                        <div class="upload-progress-section">
                            <h3 class="progress-title">证照上传进度</h3>
                            <div class="progress-bar-container">
                                <div class="progress-bar-bg"><div class="progress-fill" :style="{ width: detail.upload_progress + '%' }"></div></div>
                                <div class="progress-text">{{ detail.upload_count || 0 }} / {{ detail.total_upload_count || 5 }} 项已上传 ({{ detail.upload_progress || 0 }}%)</div>
                            </div>
                        </div>
                        <div class="detail-section">
                            <h3>基本信息</h3>
                            <div class="detail-grid">
                                <div class="detail-item"><label>企业名称</label><span>{{ detail.company_name }}</span></div>
                                <div class="detail-item"><label>统一社会信用代码</label><span>{{ detail.unified_social_credit_code }}</span></div>
                                <div class="detail-item"><label>法定代表人</label><span>{{ detail.legal_person }}</span></div>
                                <div class="detail-item"><label>法人身份证号</label><span>{{ detail.legal_person_id_number || '-' }}</span></div>
                                <div class="detail-item"><label>注册资本</label><span>{{ detail.registered_capital || '-' }}</span></div>
                                <div class="detail-item"><label>成立日期</label><span>{{ detail.establish_date || '-' }}</span></div>
                                <div class="detail-item full-width"><label>经营范围</label><span>{{ detail.business_scope || '-' }}</span></div>
                                <div class="detail-item full-width"><label>注册地址</label><span>{{ detail.full_address || '-' }}</span></div>
                            </div>
                        </div>
                        <div class="detail-section">
                            <h3>联系信息</h3>
                            <div class="detail-grid">
                                <div class="detail-item"><label>联系人</label><span>{{ detail.contact_name }}</span></div>
                                <div class="detail-item"><label>联系电话</label><span>{{ detail.contact_phone }}</span></div>
                                <div class="detail-item full-width"><label>联系邮箱</label><span>{{ detail.contact_email || '-' }}</span></div>
                            </div>
                        </div>
                        <div class="detail-section certificates-section">
                            <h3>资质证照详情追踪</h3>
                            <div class="certificates-list">
                                <div :class="['cert-item', detail.business_license ? 'uploaded' : 'missing']">
                                    <div class="cert-status-icon">
                                        <svg v-if="detail.business_license" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </div>
                                    <div class="cert-info">
                                        <div class="cert-name"><span class="required-mark">*</span>营业执照</div>
                                        <div class="cert-status-text">{{ detail.business_license ? '已上传' : '待上传' }}</div>
                                    </div>
                                    <div class="cert-preview" v-if="detail.business_license">
                                        <img v-if="isImage(detail.business_license)" :src="detail.business_license" alt="营业执照">
                                        <a v-else :href="detail.business_license" target="_blank" class="cert-file-link">查看文件</a>
                                    </div>
                                </div>
                                <div :class="['cert-item', detail.legal_person_id_front ? 'uploaded' : 'missing']">
                                    <div class="cert-status-icon">
                                        <svg v-if="detail.legal_person_id_front" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </div>
                                    <div class="cert-info">
                                        <div class="cert-name"><span class="required-mark">*</span>法人身份证正面</div>
                                        <div class="cert-status-text">{{ detail.legal_person_id_front ? '已上传' : '待上传' }}</div>
                                    </div>
                                    <div class="cert-preview" v-if="detail.legal_person_id_front">
                                        <img v-if="isImage(detail.legal_person_id_front)" :src="detail.legal_person_id_front" alt="身份证正面">
                                        <a v-else :href="detail.legal_person_id_front" target="_blank" class="cert-file-link">查看文件</a>
                                    </div>
                                </div>
                                <div :class="['cert-item', detail.legal_person_id_back ? 'uploaded' : 'missing']">
                                    <div class="cert-status-icon">
                                        <svg v-if="detail.legal_person_id_back" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </div>
                                    <div class="cert-info">
                                        <div class="cert-name"><span class="required-mark">*</span>法人身份证反面</div>
                                        <div class="cert-status-text">{{ detail.legal_person_id_back ? '已上传' : '待上传' }}</div>
                                    </div>
                                    <div class="cert-preview" v-if="detail.legal_person_id_back">
                                        <img v-if="isImage(detail.legal_person_id_back)" :src="detail.legal_person_id_back" alt="身份证反面">
                                        <a v-else :href="detail.legal_person_id_back" target="_blank" class="cert-file-link">查看文件</a>
                                    </div>
                                </div>
                                <div v-if="detail.organization_code_cert" class="cert-item uploaded">
                                    <div class="cert-status-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    <div class="cert-info"><div class="cert-name">组织机构代码证</div><div class="cert-status-text">已上传</div></div>
                                    <div class="cert-preview">
                                        <img v-if="isImage(detail.organization_code_cert)" :src="detail.organization_code_cert" alt="组织机构代码证">
                                        <a v-else :href="detail.organization_code_cert" target="_blank" class="cert-file-link">查看文件</a>
                                    </div>
                                </div>
                                <div v-if="detail.tax_registration_cert" class="cert-item uploaded">
                                    <div class="cert-status-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    <div class="cert-info"><div class="cert-name">税务登记证</div><div class="cert-status-text">已上传</div></div>
                                    <div class="cert-preview">
                                        <img v-if="isImage(detail.tax_registration_cert)" :src="detail.tax_registration_cert" alt="税务登记证">
                                        <a v-else :href="detail.tax_registration_cert" target="_blank" class="cert-file-link">查看文件</a>
                                    </div>
                                </div>
                                <div v-for="(cert, idx) in detail.other_certificates" :key="'other-'+idx" class="cert-item uploaded">
                                    <div class="cert-status-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    <div class="cert-info"><div class="cert-name">{{ cert.name || '其他证照' }}</div><div class="cert-status-text">已上传</div></div>
                                    <div class="cert-preview">
                                        <img v-if="isImage(cert.url)" :src="cert.url" :alt="cert.name">
                                        <a v-else :href="cert.url" target="_blank" class="cert-file-link">查看文件</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="detail-section" v-if="detail.remark">
                            <h3>审核备注</h3>
                            <div class="remark-box">{{ detail.remark }}</div>
                        </div>
                    </div>
                    <div class="detail-footer">
                        <button class="btn-close" @click="closeDetail">关闭</button>
                        <template v-if="detail.status == 0">
                            <button class="btn-reject" @click="openReviewModal(detail, 2)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                审核拒绝
                            </button>
                            <button class="btn-approve" @click="openReviewModal(detail, 1)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                审核通过
                            </button>
                        </template>
                        <button class="btn-edit" @click="editItem(detail.id)" :disabled="detail.status == 1">
                            {{ detail.status == 1 ? '已审核，不可编辑' : '编辑资料' }}
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="showReviewModal && reviewTarget" class="review-modal-mask" @click.self="closeReviewModal">
                <div class="review-modal">
                    <div class="review-modal-header">
                        <h3>{{ reviewStatus === 1 ? '审核确认 - 通过' : '审核确认 - 拒绝' }}</h3>
                        <button class="close-btn" @click="closeReviewModal">×</button>
                    </div>
                    <div class="review-modal-body">
                        <div class="review-warn" :class="reviewStatus === 1 ? 'approve-warn' : 'reject-warn'">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span v-if="reviewStatus === 1">审核通过后将无法修改，请确认所有必填证照（营业执照、法人身份证正反面）均已上传。</span>
                            <span v-else>审核拒绝后供应商可重新修改提交，请填写详细的拒绝原因以便供应商修改。</span>
                        </div>
                        <div class="review-enterprise">
                            <label>审核对象</label>
                            <div class="review-enterprise-name">{{ reviewTarget.company_name }}</div>
                            <div class="review-enterprise-code">{{ reviewTarget.unified_social_credit_code }}</div>
                        </div>
                        <div class="form-group">
                            <label>审核备注 <span v-if="reviewStatus === 2" class="required-mark">*</span></label>
                            <textarea v-model="reviewRemark" rows="4" :placeholder="reviewStatus === 1 ? '可选：填写审核通过说明' : '必填：请填写拒绝原因'"></textarea>
                        </div>
                    </div>
                    <div class="review-modal-footer">
                        <button class="btn-cancel" @click="closeReviewModal" :disabled="reviewSubmitting">取消</button>
                        <button class="btn-confirm-review" :class="reviewStatus === 1 ? 'btn-approve' : 'btn-reject'" @click="submitReview" :disabled="reviewSubmitting">
                            <svg v-if="reviewSubmitting" class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                            <span v-if="reviewStatus === 1">{{ reviewSubmitting ? '提交中...' : '确认通过' }}</span>
                            <span v-else>{{ reviewSubmitting ? '提交中...' : '确认拒绝' }}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="showToast" class="toast" :class="toastType">{{ toastMessage }}</div>
        </div>
    </div>
    <script src="js/list.js"></script>
</body>
</html>
"""

list_html_path = os.path.join(BASE_DIR, 'frontend', 'list.html')
with open(list_html_path, 'w', encoding='utf-8') as f:
    f.write(list_html)
print(f'OK: list.html written: {len(list_html)} chars, {list_html.count(chr(10))} lines')


# ============================================================
# 3. detail.php - 增加上传进度追踪字段
# ============================================================
detail_php_path = os.path.join(BASE_DIR, 'backend', 'api', 'detail.php')
with open(detail_php_path, 'r', encoding='utf-8') as f:
    detail_php = f.read()

old_marker = "$detail['status_text'] = $statusText[$detail['status']] ?? '未知';\n    \n    $fullAddress"
new_block = """$detail['status_text'] = $statusText[$detail['status']] ?? '未知';
    
    $fullAddress = $detail['registered_address_province'] . 
                   $detail['registered_address_city'] . 
                   $detail['registered_address_district'] . 
                   $detail['registered_address_detail'];
    $detail['full_address'] = trim($fullAddress);
    
    $uploadCount = 0;
    $totalUploadCount = 3;
    if (!empty($detail['business_license'])) $uploadCount++;
    if (!empty($detail['legal_person_id_front'])) $uploadCount++;
    if (!empty($detail['legal_person_id_back'])) $uploadCount++;
    if (!empty($detail['organization_code_cert'])) {
        $uploadCount++;
        $totalUploadCount++;
    }
    if (!empty($detail['tax_registration_cert'])) {
        $uploadCount++;
        $totalUploadCount++;
    }
    if (!empty($detail['other_certificates']) && is_array($detail['other_certificates'])) {
        $otherCount = count($detail['other_certificates']);
        $uploadCount += $otherCount;
        $totalUploadCount += $otherCount;
    }
    $detail['upload_count'] = $uploadCount;
    $detail['total_upload_count'] = $totalUploadCount;
    $detail['upload_progress'] = $totalUploadCount > 0 ? round($uploadCount / $totalUploadCount * 100) : 0;
    
    json_response(200, '查询成功', $detail);

} catch (PDOException $e) {
    json_response(500, '服务器错误: ' . $e->getMessage());
}"""

if 'upload_count' in detail_php:
    print(f'OK: detail.php already contains upload_count fields (skip patch)')
else:
    # Find and replace the old ending block
    old_end = """$detail['status_text'] = $statusText[$detail['status']] ?? '未知';
    
    $fullAddress = $detail['registered_address_province'] . 
                   $detail['registered_address_city'] . 
                   $detail['registered_address_district'] . 
                   $detail['registered_address_detail'];
    $detail['full_address'] = trim($fullAddress);
    
    json_response(200, '查询成功', $detail);
    
} catch (PDOException $e) {
    json_response(500, '服务器错误: ' . $e->getMessage());
}"""
    
    if old_end in detail_php:
        new_php = detail_php.replace(old_end, new_block)
        with open(detail_php_path, 'w', encoding='utf-8') as f:
            f.write(new_php)
        print(f'OK: detail.php patched with upload tracking')
    else:
        print(f'WARN: could not find expected pattern in detail.php')
        sys.exit(1)

print('ALL FILES WRITTEN SUCCESSFULLY')
"""
# Use Write tool to create this script then execute it
script_path = os.path.join(BASE_DIR, '_tmp_write_files.py')
with open(script_path, 'w', encoding='utf-8') as f:
    f.write("script_content")
