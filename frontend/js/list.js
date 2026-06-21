const { createApp, reactive, ref, computed, onMounted } = Vue;

const API_BASE = '../backend/api';

const CACHE_KEYS = {
    KYB_LIST: 'kyb_supplier_list',
    KYB_DETAIL_PREFIX: 'kyb_supplier_detail_',
    KYB_STATS: 'kyb_supplier_stats'
};

function clearKybCache(id = null) {
    try {
        localStorage.removeItem(CACHE_KEYS.KYB_LIST);
        localStorage.removeItem(CACHE_KEYS.KYB_STATS);
        if (id) {
            localStorage.removeItem(CACHE_KEYS.KYB_DETAIL_PREFIX + id);
        }
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_KEYS.KYB_DETAIL_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) {
        console.warn('清理缓存失败:', e);
    }
}

createApp({
    setup() {
        const loading = ref(false);
        const error = ref('');
        const list = ref([]);
        const detail = ref(null);
        const showDetail = ref(false);
        const showToast = ref(false);
        const toastMessage = ref('');
        const toastType = ref('success');

        const reviewSubmitting = ref(false);
        const showReviewModal = ref(false);
        const reviewTarget = ref(null);
        const reviewForm = reactive({
            status: 2,
            remark: ''
        });

        const filters = reactive({
            status: '',
            keyword: ''
        });

        const pagination = reactive({
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0
        });

        const stats = reactive({
            pending: 0,
            approved: 0,
            rejected: 0
        });

        const visiblePages = computed(() => {
            const pages = [];
            const total = pagination.totalPages;
            const current = pagination.page;
            
            if (total <= 7) {
                for (let i = 1; i <= total; i++) pages.push(i);
            } else {
                if (current <= 4) {
                    for (let i = 1; i <= 5; i++) pages.push(i);
                } else if (current >= total - 3) {
                    for (let i = total - 4; i <= total; i++) pages.push(i);
                } else {
                    for (let i = current - 2; i <= current + 2; i++) pages.push(i);
                }
            }
            return pages;
        });

        const reviewMissingFiles = computed(() => {
            const target = reviewTarget.value || detail.value;
            if (!target) return [];
            const missing = [];
            if (!target.business_license) missing.push('营业执照');
            if (!target.legal_person_id_front) missing.push('法人身份证正面');
            if (!target.legal_person_id_back) missing.push('法人身份证反面');
            return missing;
        });

        const canSubmitReview = computed(() => {
            return reviewForm.remark.trim().length > 0 && reviewForm.status > 0;
        });

        function formatDate(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const pad = n => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }

        function showToastMessage(msg, type = 'success') {
            toastMessage.value = msg;
            toastType.value = type;
            showToast.value = true;
            setTimeout(() => {
                showToast.value = false;
            }, 3000);
        }

        function showConfirmDialog(message, title = '确认操作') {
            return new Promise((resolve) => {
                const result = window.confirm(`${title}\n\n${message}`);
                resolve(result);
            });
        }

        function syncReviewRecord(updatedRecord) {
            if (!updatedRecord || !updatedRecord.id) return;

            const idx = list.value.findIndex(i => i.id === updatedRecord.id);
            if (idx !== -1) {
                list.value[idx] = { ...list.value[idx], ...updatedRecord };
            }

            if (detail.value && detail.value.id === updatedRecord.id) {
                detail.value = { ...detail.value, ...updatedRecord };
            }

            updateStats();
        }

        function updateStats() {
            let pending = 0, approved = 0, rejected = 0;
            list.value.forEach(item => {
                if (item.status == 0) pending++;
                else if (item.status == 1) approved++;
                else if (item.status == 2) rejected++;
            });
            stats.pending = pending;
            stats.approved = approved;
            stats.rejected = rejected;
        }

        async function loadList(page = null) {
            if (page !== null) {
                pagination.page = page;
            }
            
            loading.value = true;
            error.value = '';

            try {
                const params = new URLSearchParams({
                    page: pagination.page,
                    pageSize: pagination.pageSize
                });
                
                if (filters.status !== '') {
                    params.append('status', filters.status);
                }
                if (filters.keyword) {
                    params.append('keyword', filters.keyword);
                }

                const response = await fetch(`${API_BASE}/list.php?${params.toString()}`);
                const result = await response.json();

                if (result.code === 200) {
                    list.value = result.data.list;
                    pagination.total = result.data.pagination.total;
                    pagination.totalPages = result.data.pagination.totalPages;
                    updateStats();
                    clearKybCache();
                } else {
                    throw new Error(result.message || '加载失败');
                }
            } catch (e) {
                console.error('加载列表失败:', e);
                error.value = e.message || '加载失败，请检查PHP后端是否正常运行';
                list.value = [];
            } finally {
                loading.value = false;
            }
        }

        async function refreshStatus(item) {
            if (!item || !item.id) return;
            
            try {
                const response = await fetch(`${API_BASE}/detail.php?id=${item.id}`);
                const result = await response.json();
                
                if (result.code === 200) {
                    syncReviewRecord(result.data);
                    clearKybCache(item.id);
                    showToastMessage('状态已刷新');
                }
            } catch (e) {
                showToastMessage('刷新失败: ' + (e.message || '未知错误'), 'error');
            }
        }

        async function viewDetail(id) {
            if (!id) return;
            
            loading.value = true;
            try {
                const response = await fetch(`${API_BASE}/detail.php?id=${id}`);
                const result = await response.json();
                
                if (result.code === 200) {
                    detail.value = result.data;
                    showDetail.value = true;
                } else {
                    throw new Error(result.message || '获取详情失败');
                }
            } catch (e) {
                console.error('获取详情失败:', e);
                showToastMessage('获取详情失败: ' + (e.message || '未知错误'), 'error');
            } finally {
                loading.value = false;
            }
        }

        function closeDetail() {
            showDetail.value = false;
            detail.value = null;
        }

        function editItem(id) {
            sessionStorage.setItem('editKybId', id);
            location.href = 'index.html?edit=' + id;
        }

        function openReviewModal(item) {
            if (!item || item.status != 0) return;
            reviewTarget.value = item;
            reviewForm.status = 2;
            reviewForm.remark = '';
            showReviewModal.value = true;
        }

        function openReviewModalFromDetail(item) {
            openReviewModal(item);
        }

        function closeReviewModal() {
            if (reviewSubmitting.value) return;
            showReviewModal.value = false;
            reviewTarget.value = null;
            reviewForm.status = 2;
            reviewForm.remark = '';
        }

        async function quickApprove(item) {
            if (!item || item.status != 0) return;
            
            if (reviewMissingFiles.value.length > 0) {
                showToastMessage('证照不完整，缺少：' + reviewMissingFiles.value.join('、'), 'error');
                return;
            }

            const confirmed = await showConfirmDialog(
                `确定要审核通过「${item.company_name}」吗？\n\n审核通过后将无法修改，请确认证照完整有效。`,
                '审核通过确认'
            );
            if (!confirmed) return;

            reviewSubmitting.value = true;
            try {
                const response = await fetch(`${API_BASE}/review.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: item.id,
                        status: 1,
                        remark: '证照齐全，审核通过'
                    })
                });
                const result = await response.json();

                if (result.code === 200) {
                    clearKybCache(item.id);
                    syncReviewRecord(result.data);
                    showToastMessage('审核通过成功', 'success');
                    if (detail.value && detail.value.id === item.id) {
                        closeDetail();
                    }
                } else {
                    if (result.code === 400) {
                        showToastMessage(result.message || '审核失败', 'error');
                    } else {
                        throw new Error(result.message || '审核失败');
                    }
                }
            } catch (e) {
                console.error('审核失败:', e);
                showToastMessage('审核失败: ' + (e.message || '未知错误'), 'error');
            } finally {
                reviewSubmitting.value = false;
            }
        }

        async function submitReview() {
            if (!canSubmitReview.value || !reviewTarget.value) return;

            if (reviewForm.status == 1 && reviewMissingFiles.value.length > 0) {
                showToastMessage('证照不完整，缺少：' + reviewMissingFiles.value.join('、'), 'error');
                return;
            }

            const actionText = reviewForm.status == 1 ? '审核通过' : '审核拒绝';
            const confirmed = await showConfirmDialog(
                `确定要${actionText}「${reviewTarget.value.company_name}」吗？\n\n审核备注：${reviewForm.remark}`,
                `${actionText}确认`
            );
            if (!confirmed) return;

            reviewSubmitting.value = true;
            try {
                const response = await fetch(`${API_BASE}/review.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: reviewTarget.value.id,
                        status: reviewForm.status,
                        remark: reviewForm.remark.trim()
                    })
                });
                const result = await response.json();

                if (result.code === 200) {
                    clearKybCache(reviewTarget.value.id);
                    syncReviewRecord(result.data);
                    showToastMessage(`${actionText}成功`, 'success');
                    closeReviewModal();
                    if (detail.value && detail.value.id === reviewTarget.value.id) {
                        closeDetail();
                    }
                } else {
                    if (result.code === 400) {
                        showToastMessage(result.message || '审核失败', 'error');
                    } else {
                        throw new Error(result.message || '审核失败');
                    }
                }
            } catch (e) {
                console.error('审核失败:', e);
                showToastMessage('审核失败: ' + (e.message || '未知错误'), 'error');
            } finally {
                reviewSubmitting.value = false;
            }
        }

        function checkAutoRefresh() {
            try {
                const justSaved = sessionStorage.getItem('justSavedKyb');
                if (justSaved) {
                    sessionStorage.removeItem('justSavedKyb');
                    showToastMessage('注册提交成功，已进入审核队列', 'success');
                    loadList(1);
                }
            } catch (e) {}
        }

        onMounted(() => {
            loadList();
            checkAutoRefresh();
        });

        return {
            loading,
            error,
            list,
            filters,
            pagination,
            stats,
            visiblePages,
            detail,
            showDetail,
            showToast,
            toastMessage,
            toastType,
            reviewSubmitting,
            showReviewModal,
            reviewTarget,
            reviewForm,
            reviewMissingFiles,
            canSubmitReview,
            formatDate,
            loadList,
            refreshStatus,
            viewDetail,
            closeDetail,
            editItem,
            openReviewModal,
            openReviewModalFromDetail,
            closeReviewModal,
            quickApprove,
            submitReview
        };
    }
}).mount('#app');
