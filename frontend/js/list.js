const { createApp, reactive, ref, onMounted } = Vue;

const API_BASE = '../backend/api';

createApp({
    setup() {
        const loading = ref(false);
        const list = ref([]);
        const keyword = ref('');
        const statusFilter = ref('');
        const pagination = reactive({
            page: 1,
            page_size: 10,
            total: 0,
            total_pages: 0
        });
        const stats = reactive({
            pending: 0,
            approved: 0,
            rejected: 0
        });

        function formatTime(timeStr) {
            if (!timeStr) return '-';
            return timeStr;
        }

        async function fetchList() {
            loading.value = true;
            try {
                const params = new URLSearchParams({
                    page: pagination.page,
                    page_size: pagination.page_size
                });
                if (keyword.value) {
                    params.append('keyword', keyword.value);
                }
                if (statusFilter.value !== '') {
                    params.append('status', statusFilter.value);
                }

                const response = await fetch(`${API_BASE}/list.php?${params.toString()}`);
                const result = await response.json();

                if (result.code === 200) {
                    list.value = result.data.list;
                    pagination.total = result.data.total;
                    pagination.page = result.data.page;
                    pagination.page_size = result.data.page_size;
                    pagination.total_pages = result.data.total_pages;
                    calculateStats(result.data.list);
                } else {
                    console.warn('获取列表失败:', result.message);
                    list.value = [];
                }
            } catch (error) {
                console.warn('获取列表接口调用失败，使用模拟数据:', error);
                useMockData();
            } finally {
                loading.value = false;
            }
        }

        function calculateStats(dataList) {
            stats.pending = dataList.filter(i => i.status === 0).length;
            stats.approved = dataList.filter(i => i.status === 1).length;
            stats.rejected = dataList.filter(i => i.status === 2).length;
        }

        function useMockData() {
            const mockList = [
                {
                    id: 1,
                    company_name: '北京科技发展有限公司',
                    unified_social_credit_code: '91110108MA01ABCD23',
                    legal_person: '张三',
                    contact_name: '李四',
                    contact_phone: '13800138001',
                    status: 0,
                    status_text: '待审核',
                    created_at: '2024-01-15 10:30:00',
                    updated_at: '2024-01-15 10:30:00'
                },
                {
                    id: 2,
                    company_name: '上海教育科技有限公司',
                    unified_social_credit_code: '91310101MA1GHIJ456',
                    legal_person: '王五',
                    contact_name: '赵六',
                    contact_phone: '13900139002',
                    status: 1,
                    status_text: '审核通过',
                    created_at: '2024-01-10 14:20:00',
                    updated_at: '2024-01-12 09:15:00'
                },
                {
                    id: 3,
                    company_name: '广州信息技术有限公司',
                    unified_social_credit_code: '91440101MA9KLMN789',
                    legal_person: '陈七',
                    contact_name: '周八',
                    contact_phone: '13700137003',
                    status: 2,
                    status_text: '审核拒绝',
                    created_at: '2024-01-08 16:45:00',
                    updated_at: '2024-01-09 11:30:00'
                },
                {
                    id: 4,
                    company_name: '深圳创新科技有限公司',
                    unified_social_credit_code: '91440300MA5OPQR012',
                    legal_person: '吴九',
                    contact_name: '郑十',
                    contact_phone: '13600136004',
                    status: 0,
                    status_text: '待审核',
                    created_at: '2024-01-14 09:00:00',
                    updated_at: '2024-01-14 09:00:00'
                },
                {
                    id: 5,
                    company_name: '杭州数字教育有限公司',
                    unified_social_credit_code: '91330100MA2STUV345',
                    legal_person: '冯十一',
                    contact_name: '钱十二',
                    contact_phone: '13500135005',
                    status: 1,
                    status_text: '审核通过',
                    created_at: '2024-01-05 11:10:00',
                    updated_at: '2024-01-07 15:20:00'
                }
            ];
            list.value = mockList;
            pagination.total = mockList.length;
            pagination.total_pages = 1;
            calculateStats(mockList);
        }

        function searchList() {
            pagination.page = 1;
            fetchList();
        }

        function refreshList() {
            fetchList();
        }

        function changePage(page) {
            pagination.page = page;
            fetchList();
        }

        function viewDetail(id) {
            window.location.href = `detail.html?id=${id}`;
        }

        onMounted(() => {
            fetchList();
        });

        return {
            loading,
            list,
            keyword,
            statusFilter,
            pagination,
            stats,
            formatTime,
            searchList,
            refreshList,
            changePage,
            viewDetail
        };
    }
}).mount('#app');
