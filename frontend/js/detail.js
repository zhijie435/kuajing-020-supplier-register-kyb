const { createApp, reactive, ref, onMounted } = Vue;

const API_BASE = '../backend/api';

createApp({
    setup() {
        const loading = ref(false);
        const error = ref('');
        const detail = reactive({});
        const previewModal = ref(false);
        const previewImageUrl = ref('');

        function getQueryParam(name) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name);
        }

        function formatTime(timeStr) {
            if (!timeStr) return '-';
            return timeStr;
        }

        function isImage(url) {
            if (!url) return false;
            return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) || url.startsWith('blob:') || url.startsWith('data:image');
        }

        function useMockData() {
            const mockDetail = {
                id: 1,
                company_name: '北京科技发展有限公司',
                unified_social_credit_code: '91110108MA01ABCD23',
                legal_person: '张三',
                legal_person_id_card: '110101199001011234',
                registered_capital: '500万元人民币',
                establish_date: '2020-01-15',
                business_scope: '技术开发、技术咨询、技术服务、技术转让；计算机系统服务；基础软件服务；应用软件服务；软件开发；软件咨询；产品设计；模型设计；包装装潢设计；教育咨询；经济贸易咨询；文化咨询；体育咨询；公共关系服务；会议服务；工艺美术设计；电脑动画设计；企业策划、设计；设计、制作、代理、发布广告；市场调查；企业管理咨询；组织文化艺术交流活动；文艺创作；承办展览展示活动；会议服务。',
                registered_address_province: '北京市',
                registered_address_city: '北京市',
                registered_address_district: '海淀区',
                registered_address_detail: '中关村大街1号',
                contact_name: '李四',
                contact_phone: '13800138001',
                contact_email: 'contact@example.com',
                business_license: '',
                legal_person_id_front: '',
                legal_person_id_back: '',
                other_certificates: [
                    { name: '税务登记证', url: '', original_name: '' },
                    { name: '组织机构代码证', url: '', original_name: '' }
                ],
                status: 0,
                status_text: '待审核',
                remark: '',
                created_at: '2024-01-15 10:30:00',
                updated_at: '2024-01-15 10:30:00',
                full_address: '北京市北京市海淀区中关村大街1号',
                upload_count: 0,
                total_upload_count: 5,
                upload_progress: 0
            };
            Object.assign(detail, mockDetail);
        }

        async function fetchDetail() {
            const id = getQueryParam('id');
            if (!id) {
                error.value = '缺少企业ID';
                return;
            }

            loading.value = true;
            error.value = '';

            try {
                const response = await fetch(`${API_BASE}/detail.php?id=${id}`);
                const result = await response.json();

                if (result.code === 200) {
                    Object.keys(detail).forEach(key => delete detail[key]);
                    Object.assign(detail, result.data);
                } else {
                    error.value = result.message || '获取详情失败';
                }
            } catch (err) {
                console.warn('获取详情接口调用失败，使用模拟数据:', err);
                useMockData();
            } finally {
                loading.value = false;
            }
        }

        function goBack() {
            window.history.back();
        }

        function previewImage(url) {
            previewImageUrl.value = url;
            previewModal.value = true;
        }

        function closePreview() {
            previewModal.value = false;
            previewImageUrl.value = '';
        }

        onMounted(() => {
            fetchDetail();
        });

        return {
            loading,
            error,
            detail,
            previewModal,
            previewImageUrl,
            formatTime,
            isImage,
            fetchDetail,
            goBack,
            previewImage,
            closePreview
        };
    }
}).mount('#app');
