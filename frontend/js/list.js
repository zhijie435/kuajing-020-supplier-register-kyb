const { createApp, reactive, ref, computed, onMounted } = Vue;

const API_BASE = '../backend/api';

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
                    
                    let pending = 0, approved = 0, rejected = 0;
                    list.value.forEach(item => {
                        if (item.status == 0) pending++;
                        else if (item.status == 1) approved++;
                        else if (item.status == 2) rejected++;
                    });
                    stats.pending = pending;
                    stats.approved = approved;
                    stats.rejected = rejected;
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
                    const idx = list.value.findIndex(i => i.id === item.id);
                    if (idx !== -1) {
                        list.value[idx].status = result.data.status;
                        list.value[idx].status_text = result.data.status_text;
                        list.value[idx].remark = result.data.remark;
                        list.value[idx].updated_at = result.data.updated_at;
                    }
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
            formatDate,
            loadList,
            refreshStatus,
            viewDetail,
            closeDetail,
            editItem
        };
    }
}).mount('#app');
