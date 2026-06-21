const MOCK_DATA = [
  {
    id: 1001,
    company_name: '北京明日之星教育科技有限公司',
    unified_social_credit_code: '91110108MA01ABCD12',
    legal_person: '张建国',
    legal_person_id_number: '110101198001011234',
    registered_capital: '1000万元',
    establish_date: '2018-06-15',
    business_scope: '技术开发、技术咨询、技术服务、技术转让；教育咨询（不含中介服务）；软件开发；计算机系统服务；销售自行开发的产品',
    full_address: '北京市海淀区中关村大街27号中关村大厦12层1208室',
    contact_name: '李明',
    contact_phone: '13801234567',
    contact_email: 'liming@mingri-star.com',
    business_license: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=business%20license%20certificate%20document%20scan%20with%20red%20chop&image_size=landscape_4_3',
    legal_person_id_front: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ID%20card%20front%20side%20scan%20with%20photo&image_size=landscape_4_3',
    legal_person_id_back: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20ID%20card%20back%20side%20scan&image_size=landscape_4_3',
    organization_code_cert: null,
    tax_registration_cert: null,
    other_certificates: [],
    status: 0,
    status_text: '待审核',
    remark: null,
    created_at: '2024-01-15 10:30:25',
    updated_at: '2024-01-15 10:30:25',
    upload_count: 3,
    total_upload_count: 3,
    upload_progress: 100
  },
  {
    id: 1002,
    company_name: '上海新知在线教育有限公司',
    unified_social_credit_code: '91310110MA1G3XYZ34',
    legal_person: '王丽华',
    legal_person_id_number: '310101197512124321',
    registered_capital: '500万元',
    establish_date: '2020-03-20',
    business_scope: '在线教育服务；教育软件研发；出版物经营；文化艺术交流策划；会务服务；展览展示服务',
    full_address: '上海市杨浦区国定东路275号绿地汇创大厦8楼805室',
    contact_name: '赵芳',
    contact_phone: '13923456789',
    contact_email: 'zhaofang@xinzhi-online.com',
    business_license: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=company%20business%20license%20formal%20document&image_size=landscape_4_3',
    legal_person_id_front: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ID%20card%20front%20official%20document&image_size=landscape_4_3',
    legal_person_id_back: null,
    organization_code_cert: null,
    tax_registration_cert: null,
    other_certificates: [],
    status: 0,
    status_text: '待审核',
    remark: null,
    created_at: '2024-01-18 14:22:10',
    updated_at: '2024-01-18 14:22:10',
    upload_count: 2,
    total_upload_count: 3,
    upload_progress: 67
  },
  {
    id: 1003,
    company_name: '深圳优课未来教育集团',
    unified_social_credit_code: '91440300MA5ELMNO56',
    legal_person: '陈志强',
    legal_person_id_number: '440301198205205678',
    registered_capital: '2000万元',
    establish_date: '2016-09-08',
    business_scope: '教育产业投资；在线教育平台运营；教育软件研发及销售；教育咨询；企业管理咨询；教育培训（不含学科类培训）',
    full_address: '深圳市南山区科技园南区T3栋腾讯大厦20楼2001-2012',
    contact_name: '周文斌',
    contact_phone: '13612345678',
    contact_email: 'zhouwb@youke-future.com',
    business_license: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=official%20business%20license%20of%20corporation&image_size=landscape_4_3',
    legal_person_id_front: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20citizen%20ID%20card%20front&image_size=landscape_4_3',
    legal_person_id_back: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20citizen%20ID%20card%20back&image_size=landscape_4_3',
    organization_code_cert: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=organization%20code%20certificate%20document&image_size=landscape_4_3',
    tax_registration_cert: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tax%20registration%20certificate%20china&image_size=landscape_4_3',
    other_certificates: [{ name: 'ICP增值电信业务经营许可证', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ICP%20license%20certificate%20official&image_size=landscape_4_3' }],
    status: 0,
    status_text: '待审核',
    remark: null,
    created_at: '2024-01-20 09:15:33',
    updated_at: '2024-01-20 09:15:33',
    upload_count: 6,
    total_upload_count: 6,
    upload_progress: 100
  },
  {
    id: 1004,
    company_name: '成都智慧树教育咨询有限公司',
    unified_social_credit_code: '91510104MA61UABC78',
    legal_person: '刘智慧',
    legal_person_id_number: '510104198808081234',
    registered_capital: '300万元',
    establish_date: '2021-12-01',
    business_scope: '教育咨询；企业管理咨询；软件开发；信息系统集成服务；信息技术咨询服务；数据处理和存储服务',
    full_address: '成都市锦江区红星路三段16号正熙国际大厦15楼1505室',
    contact_name: '孙小美',
    contact_phone: '13798765432',
    contact_email: 'sunxm@zhihuishu-edu.com',
    business_license: null,
    legal_person_id_front: null,
    legal_person_id_back: null,
    organization_code_cert: null,
    tax_registration_cert: null,
    other_certificates: [],
    status: 0,
    status_text: '待审核',
    remark: null,
    created_at: '2024-01-22 16:45:50',
    updated_at: '2024-01-22 16:45:50',
    upload_count: 0,
    total_upload_count: 3,
    upload_progress: 0
  },
  {
    id: 1005,
    company_name: '广州博翰教育科技股份有限公司',
    unified_social_credit_code: '91440101MA9X1YZW90',
    legal_person: '黄博文',
    legal_person_id_number: '440103197610108765',
    registered_capital: '5000万元',
    establish_date: '2015-04-18',
    business_scope: '职业技能培训；教育咨询服务；教育评估；教育软件开发；网络技术的研究、开发；计算机技术开发、技术服务；图书出版选题策划',
    full_address: '广州市天河区珠江新城华夏路10号富力中心大厦28楼2801-2808',
    contact_name: '吴婷婷',
    contact_phone: '13609876543',
    contact_email: 'wutt@bohan-edu.com',
    business_license: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bohans%20business%20license&image_size=landscape_4_3',
    legal_person_id_front: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=huang%20ID%20front%20card&image_size=landscape_4_3',
    legal_person_id_back: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=huang%20ID%20back%20card&image_size=landscape_4_3',
    organization_code_cert: null,
    tax_registration_cert: null,
    other_certificates: [],
    status: 1,
    status_text: '审核通过',
    remark: '资质齐全，证照清晰，符合入驻要求。营业执照、法人身份证三项核心证照完整上传，信息核对一致。',
    created_at: '2024-01-10 11:20:15',
    updated_at: '2024-01-12 16:30:45',
    upload_count: 3,
    total_upload_count: 3,
    upload_progress: 100
  }
];
const { createApp, reactive, ref, computed, onMounted, nextTick } = Vue;
createApp({
  setup() {
    const API_BASE = '../backend/api/';
    const STORAGE_KEYS = { FILTERS: 'kyb_list_filters_v1', PAGE: 'kyb_list_page_v1', DETAIL_ID: 'kyb_edit_id_v1' };
    const PAGE_SIZE = 10;
    const list = ref([]);
    const pagination = reactive({ page: 1, total: 0, totalPages: 1, pageSize: PAGE_SIZE });
    const filters = reactive({ status: '', keyword: '' });
    const loading = ref(false);
    const error = ref('');
    const detail = ref(null);
    const showDetail = ref(false);
    const detailLoading = ref(false);
    const showReviewModal = ref(false);
    const reviewTarget = ref(null);
    const reviewStatus = ref(0);
    const reviewRemark = ref('');
    const reviewSubmitting = ref(false);
    const showToast = ref(false);
    const toastMessage = ref('');
    const toastType = ref('success');
    const usingMock = ref(false);
    const stats = computed(() => {
      const s = { pending: 0, approved: 0, rejected: 0 };
      list.value.forEach(item => { if (item.status == 0) s.pending++; else if (item.status == 1) s.approved++; else if (item.status == 2) s.rejected++; });
      return s;
    });
    const visiblePages = computed(() => {
      const pages = [];
      const total = pagination.totalPages;
      const current = pagination.page;
      let start = Math.max(1, current - 2);
      let end = Math.min(total, current + 2);
      if (end - start < 4) { if (start === 1) end = Math.min(total, 5); else start = Math.max(1, total - 4); }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    });
    function isImage(url) { if (!url) return false; return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url) || url.includes('text_to_image'); }
    function showToastFn(msg, type = 'success') { toastMessage.value = msg; toastType.value = type; showToast.value = true; setTimeout(() => showToast.value = false, 3000); }
    function formatDate(dateStr) { if (!dateStr) return '-'; return dateStr.replace('T', ' ').slice(0, 19); }
    function computeUploadStats(item) { if (item.upload_progress !== undefined) return; let cnt = 0; let total = 3; if (item.business_license) cnt++; if (item.legal_person_id_front) cnt++; if (item.legal_person_id_back) cnt++; if (item.organization_code_cert) { cnt++; total++; } if (item.tax_registration_cert) { cnt++; total++; } if (item.other_certificates && Array.isArray(item.other_certificates)) { cnt += item.other_certificates.length; total += item.other_certificates.length; } item.upload_count = cnt; item.total_upload_count = total; item.upload_progress = total > 0 ? Math.round(cnt / total * 100) : 0; }
    function saveFiltersToStorage() { try { sessionStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify({ status: filters.status, keyword: filters.keyword })); sessionStorage.setItem(STORAGE_KEYS.PAGE, String(pagination.page)); } catch (e) { } }
    function loadFiltersFromStorage() { try { const f = sessionStorage.getItem(STORAGE_KEYS.FILTERS); if (f) { const p = JSON.parse(f); filters.status = p.status || ''; filters.keyword = p.keyword || ''; } const pg = sessionStorage.getItem(STORAGE_KEYS.PAGE); if (pg) pagination.page = parseInt(pg) || 1; } catch (e) { } }
    function useMockData() { usingMock.value = true; let data = [...MOCK_DATA]; if (filters.status !== '') data = data.filter(x => String(x.status) === String(filters.status)); const kw = filters.keyword.trim().toLowerCase(); if (kw) data = data.filter(x => x.company_name.toLowerCase().includes(kw) || x.unified_social_credit_code.toLowerCase().includes(kw) || x.contact_name.toLowerCase().includes(kw)); pagination.total = data.length; pagination.totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE)); if (pagination.page > pagination.totalPages) pagination.page = 1; const start = (pagination.page - 1) * PAGE_SIZE; const pageData = data.slice(start, start + PAGE_SIZE); pageData.forEach(computeUploadStats); list.value = pageData; }
    async function loadList(page) { if (page !== undefined) { pagination.page = Math.max(1, page); saveFiltersToStorage(); } loading.value = true; error.value = ''; try { let url = `${API_BASE}list.php?page=${pagination.page}&pageSize=${PAGE_SIZE}`; if (filters.status !== '') url += `&status=${filters.status}`; if (filters.keyword.trim()) url += `&keyword=${encodeURIComponent(filters.keyword.trim())}`; const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error('服务器响应错误'); const text = await response.text(); const data = JSON.parse(text); if (data.code === 0) { usingMock.value = false; pagination.total = data.data.total; pagination.totalPages = data.data.totalPages || Math.max(1, Math.ceil(data.data.total / PAGE_SIZE)); const rows = data.data.list || []; rows.forEach(item => { item.status_text = item.status == 0 ? '待审核' : item.status == 1 ? '审核通过' : '审核拒绝'; computeUploadStats(item); }); list.value = rows; } else { throw new Error(data.message || '获取列表失败'); } } catch (e) { console.warn('API调用失败，使用模拟数据:', e); useMockData(); } finally { loading.value = false; } }
    async function loadDetail(id) { detailLoading.value = true; detail.value = null; try { const url = `${API_BASE}detail.php?id=${id}`; const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error('服务器错误'); const text = await response.text(); const data = JSON.parse(text); if (data.code === 0) { let d = data.data; d.status_text = d.status == 0 ? '待审核' : d.status == 1 ? '审核通过' : '审核拒绝'; computeUploadStats(d); detail.value = d; } else { throw new Error(data.message || '获取详情失败'); } } catch (e) { console.warn('详情API失败，使用mock:', e); const found = MOCK_DATA.find(m => String(m.id) === String(id)) || MOCK_DATA[0]; const d = JSON.parse(JSON.stringify(found)); d.status_text = d.status == 0 ? '待审核' : d.status == 1 ? '审核通过' : '审核拒绝'; computeUploadStats(d); detail.value = d; } finally { detailLoading.value = false; await nextTick(); const modal = document.querySelector('.detail-content'); if (modal) modal.scrollTop = 0; } }
    async function viewDetail(id) { try { sessionStorage.setItem(STORAGE_KEYS.DETAIL_ID, String(id)); } catch (e) { } await loadDetail(id); showDetail.value = true; }
    function closeDetail() { showDetail.value = false; detail.value = null; try { sessionStorage.removeItem(STORAGE_KEYS.DETAIL_ID); } catch (e) { } }
    function editItem(id) { try { sessionStorage.setItem(STORAGE_KEYS.DETAIL_ID, String(id)); } catch (e) { } location.href = `index.html?id=${id}`; }
    async function refreshStatus(item) { try { const idx = list.value.findIndex(x => x.id === item.id); if (idx < 0) return; let url = `${API_BASE}detail.php?id=${item.id}`; const resp = await fetch(url, { cache: 'no-store' }); if (resp.ok) { const text = await resp.text(); const data = JSON.parse(text); if (data.code === 0 && data.data) { const newSt = data.data.status; const newStText = newSt == 0 ? '待审核' : newSt == 1 ? '审核通过' : '审核拒绝'; list.value[idx].status = newSt; list.value[idx].status_text = newStText; list.value[idx].updated_at = data.data.updated_at; list.value[idx].remark = data.data.remark; computeUploadStats(list.value[idx]); if (detail.value && detail.value.id === item.id) { detail.value.status = newSt; detail.value.status_text = newStText; detail.value.updated_at = data.data.updated_at; detail.value.remark = data.data.remark; computeUploadStats(detail.value); } showToastFn('状态已刷新', 'success'); return; } } throw new Error('failed'); } catch (e) { const mock = MOCK_DATA.find(m => m.id === item.id); if (mock) { const idx = list.value.findIndex(x => x.id === item.id); if (idx >= 0) { list.value[idx].status = mock.status; list.value[idx].status_text = mock.status_text; computeUploadStats(list.value[idx]); } } showToastFn('刷新完成(模拟数据)', 'success'); } }
    function syncStatusToBothViews(id, newStatus, newStatusText, newRemark, newUpdatedAt) { const idx = list.value.findIndex(x => x.id === id); if (idx >= 0) { list.value[idx].status = newStatus; list.value[idx].status_text = newStatusText; if (newRemark !== undefined) list.value[idx].remark = newRemark; if (newUpdatedAt) list.value[idx].updated_at = newUpdatedAt; } if (detail.value && String(detail.value.id) === String(id)) { detail.value.status = newStatus; detail.value.status_text = newStatusText; if (newRemark !== undefined) detail.value.remark = newRemark; if (newUpdatedAt) detail.value.updated_at = newUpdatedAt; } }
    function openReviewModal(item, targetStatus) { if (!item) return; reviewTarget.value = item; reviewStatus.value = targetStatus; reviewRemark.value = ''; showReviewModal.value = true; }
    function closeReviewModal() { showReviewModal.value = false; reviewTarget.value = null; reviewStatus.value = 0; reviewRemark.value = ''; reviewSubmitting.value = false; }
    async function submitReview() { if (!reviewTarget.value) return; if (reviewStatus.value === 2 && !reviewRemark.value.trim()) { showToastFn('审核拒绝必须填写拒绝原因', 'error'); return; } reviewSubmitting.value = true; const targetId = reviewTarget.value.id; const newStatus = reviewStatus.value; const newStText = newStatus === 1 ? '审核通过' : '审核拒绝'; try { const req = { id: targetId, status: newStatus, remark: reviewRemark.value }; const resp = await fetch(`${API_BASE}review.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }); if (!resp.ok) throw new Error('HTTP ' + resp.status); const text = await resp.text(); const data = JSON.parse(text); if (data.code === 0) { syncStatusToBothViews(targetId, newStatus, newStText, req.remark, data.data ? data.data.updated_at : new Date().toISOString().slice(0, 19).replace('T', ' ')); showToastFn(newStatus === 1 ? '审核已通过' : '审核已拒绝', 'success'); closeReviewModal(); } else { throw new Error(data.message || '审核失败'); } } catch (e) { console.warn('审核API失败，本地模拟回写:', e); const updAt = new Date().toISOString().slice(0, 19).replace('T', ' '); syncStatusToBothViews(targetId, newStatus, newStText, reviewRemark.value, updAt); showToastFn(newStatus === 1 ? '审核已通过（模拟）' : '审核已拒绝（模拟）', 'success'); closeReviewModal(); } finally { reviewSubmitting.value = false; } }
    onMounted(() => { loadFiltersFromStorage(); loadList(); });
    return {
      list, pagination, filters, loading, error, detail, showDetail, detailLoading,
      showReviewModal, reviewTarget, reviewStatus, reviewRemark, reviewSubmitting,
      showToast, toastMessage, toastType, usingMock, stats, visiblePages,
      isImage, formatDate, loadList, viewDetail, closeDetail, editItem, refreshStatus,
      openReviewModal, closeReviewModal, submitReview
    };
  }
}).mount('#app');
