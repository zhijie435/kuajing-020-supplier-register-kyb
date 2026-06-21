const { createApp, reactive, ref, computed, nextTick, onMounted } = Vue;

const API_BASE = '../backend/api';

const CACHE_KEYS = {
    KYB_LIST: 'kyb_supplier_list',
    KYB_DETAIL_PREFIX: 'kyb_supplier_detail_',
    KYB_STATS: 'kyb_supplier_stats',
    KYB_FORM_DRAFT: 'kyb_form_draft'
};

function clearKybCache(id = null) {
    try {
        localStorage.removeItem(CACHE_KEYS.KYB_LIST);
        localStorage.removeItem(CACHE_KEYS.KYB_STATS);
        localStorage.removeItem(CACHE_KEYS.KYB_FORM_DRAFT);
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

function mapBackendErrorToField(message) {
    const errorMap = [
        { field: 'unified_social_credit_code', keywords: ['统一社会信用代码'] },
        { field: 'contact_phone', keywords: ['联系电话'] },
        { field: 'contact_email', keywords: ['邮箱'] },
        { field: 'company_name', keywords: ['企业名称'] },
        { field: 'legal_person', keywords: ['法定代表人'] },
        { field: 'contact_name', keywords: ['联系人'] },
        { field: 'business_license', keywords: ['营业执照'] },
        { field: 'legal_person_id_front', keywords: ['身份证正面'] },
        { field: 'legal_person_id_back', keywords: ['身份证反面'] }
    ];
    
    for (const item of errorMap) {
        if (item.keywords.some(kw => message.includes(kw))) {
            return item.field;
        }
    }
    return null;
}

createApp({
    setup() {
        const currentStep = ref(1);
        const submitting = ref(false);
        const submitSuccess = ref(false);
        const submitFailed = ref(false);
        const submitFailedMessage = ref('');
        const agreed = ref(false);
        const errors = reactive({});
        const uploadErrors = reactive({});
        const globalError = ref('');
        const isEditMode = ref(false);
        const editId = ref(0);
        const pageTitle = ref('供应商资质认证');
        const pageSubtitle = ref('KYB (Know Your Business) 企业信息注册');
        const canEdit = ref(true);
        const editStatus = ref(0);

        const businessLicenseInput = ref(null);
        const idFrontInput = ref(null);
        const idBackInput = ref(null);

        const form = reactive({
            company_name: '',
            unified_social_credit_code: '',
            legal_person: '',
            legal_person_id_card: '',
            registered_capital: '',
            establish_date: '',
            business_scope: '',
            registered_address_province: '',
            registered_address_city: '',
            registered_address_district: '',
            registered_address_detail: '',
            contact_name: '',
            contact_phone: '',
            contact_email: '',
            business_license: '',
            legal_person_id_front: '',
            legal_person_id_back: '',
            other_certificates: []
        });

        const provinces = [
            '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
            '辽宁省', '吉林省', '黑龙江省',
            '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
            '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省',
            '重庆市', '四川省', '贵州省', '云南省', '西藏自治区',
            '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'
        ];

        const cities = ref(['北京市', '上海市', '广州市', '深圳市', '杭州市', '南京市', '成都市', '武汉市', '西安市']);

        const fullAddress = computed(() => {
            const parts = [
                form.registered_address_province,
                form.registered_address_city,
                form.registered_address_district,
                form.registered_address_detail
            ];
            return parts.filter(p => p).join('');
        });

        const statusTextMap = {
            0: '待审核',
            1: '审核通过',
            2: '审核拒绝'
        };

        function validateStep1() {
            let valid = true;
            Object.keys(errors).forEach(key => delete errors[key]);

            if (!form.company_name.trim()) {
                errors.company_name = '请输入企业名称';
                valid = false;
            }
            if (!form.unified_social_credit_code.trim()) {
                errors.unified_social_credit_code = '请输入统一社会信用代码';
                valid = false;
            } else if (!/^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(form.unified_social_credit_code.toUpperCase())) {
                errors.unified_social_credit_code = '统一社会信用代码格式不正确';
                valid = false;
            }
            if (!form.legal_person.trim()) {
                errors.legal_person = '请输入法定代表人姓名';
                valid = false;
            }
            if (!form.contact_name.trim()) {
                errors.contact_name = '请输入联系人姓名';
                valid = false;
            }
            if (!form.contact_phone.trim()) {
                errors.contact_phone = '请输入联系电话';
                valid = false;
            } else if (!/^1[3-9]\d{9}$/.test(form.contact_phone)) {
                errors.contact_phone = '联系电话格式不正确';
                valid = false;
            }
            if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
                errors.contact_email = '邮箱格式不正确';
                valid = false;
            }

            return valid;
        }

        function validateStep2() {
            let valid = true;
            Object.keys(uploadErrors).forEach(key => delete uploadErrors[key]);
            globalError.value = '';

            if (!form.business_license) {
                uploadErrors.business_license = '请上传营业执照';
                valid = false;
            }
            if (!form.legal_person_id_front) {
                uploadErrors.legal_person_id_front = '请上传法人身份证正面';
                valid = false;
            }
            if (!form.legal_person_id_back) {
                uploadErrors.legal_person_id_back = '请上传法人身份证反面';
                valid = false;
            }

            form.other_certificates.forEach((cert, index) => {
                if (cert.name && !cert.url) {
                    uploadErrors['other_' + index] = '请上传"' + (cert.name || '证照' + (index + 1)) + '"的文件';
                    valid = false;
                }
            });

            return valid;
        }

        function showFieldError(field, message, step = 1) {
            if (field === 'business_license' || field === 'legal_person_id_front' || field === 'legal_person_id_back') {
                uploadErrors[field] = message;
                currentStep.value = 2;
            } else if (field && field.startsWith('other_')) {
                uploadErrors[field] = message;
                currentStep.value = 2;
            } else if (field && errors.hasOwnProperty(field)) {
                errors[field] = message;
                currentStep.value = step;
            } else {
                globalError.value = message;
            }
            scrollToError();
        }

        function nextStep() {
            globalError.value = '';
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                return;
            }
            if (currentStep.value === 1 && !validateStep1()) {
                scrollToError();
                return;
            }
            if (currentStep.value === 2 && !validateStep2()) {
                scrollToError();
                return;
            }
            if (currentStep.value < 3) {
                currentStep.value++;
            }
        }

        function scrollToError() {
            nextTick(() => {
                const firstError = document.querySelector('.error-tip, .upload-error-tip, .global-error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }

        function prevStep() {
            if (currentStep.value > 1) {
                currentStep.value--;
            }
        }

        function triggerUpload(inputRef) {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                return;
            }
            if (inputRef && inputRef.value) {
                inputRef.value.click();
            }
        }

        function isImage(url) {
            if (!url) return false;
            return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
        }

        async function uploadFile(file, type) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            try {
                const response = await fetch(`${API_BASE}/upload.php`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.code === 200) {
                    return { success: true, url: result.data.url };
                } else {
                    return { success: false, message: result.message };
                }
            } catch (error) {
                console.warn('上传接口调用失败，使用本地预览:', error);
                return { success: true, url: URL.createObjectURL(file), local: true };
            }
        }

        async function handleFileUpload(event, field) {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                event.target.value = '';
                return;
            }
            const file = event.target.files[0];
            if (!file) return;

            globalError.value = '';
            delete uploadErrors[field];

            if (file.size > 10 * 1024 * 1024) {
                uploadErrors[field] = '文件大小不能超过 10MB';
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                uploadErrors[field] = '仅支持 JPG、PNG、GIF、PDF 格式';
                return;
            }

            const result = await uploadFile(file, field);
            if (result.success) {
                form[field] = result.url;
                delete uploadErrors[field];
            } else {
                uploadErrors[field] = result.message || '上传失败，请重试';
            }

            event.target.value = '';
        }

        function removeFile(field) {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                return;
            }
            form[field] = '';
        }

        function addOtherCert() {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                return;
            }
            form.other_certificates.push({
                name: '',
                url: '',
                original_name: '',
                file: null
            });
        }

        function removeOtherCert(index) {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                return;
            }
            form.other_certificates.splice(index, 1);
        }

        function triggerOtherUpload(index) {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                return;
            }
            const inputs = document.querySelectorAll('.other-cert-input');
            if (inputs[index]) {
                inputs[index].click();
            }
        }

        async function handleOtherFileUpload(event, index) {
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法修改资料');
                event.target.value = '';
                return;
            }
            const file = event.target.files[0];
            if (!file) return;

            globalError.value = '';
            const errorKey = 'other_' + index;
            delete uploadErrors[errorKey];

            if (file.size > 10 * 1024 * 1024) {
                uploadErrors[errorKey] = '文件大小不能超过 10MB';
                return;
            }

            const result = await uploadFile(file, 'other_' + index);
            if (result.success) {
                form.other_certificates[index].url = result.url;
                form.other_certificates[index].original_name = file.name;
                delete uploadErrors[errorKey];
            } else {
                uploadErrors[errorKey] = result.message || '上传失败，请重试';
            }

            event.target.value = '';
        }

        async function handleSubmit() {
            globalError.value = '';
            
            if (!canEdit.value) {
                showFieldError(null, '该企业已通过审核，无法提交修改');
                return;
            }
            
            if (!agreed.value) {
                globalError.value = '请先阅读并同意相关协议';
                scrollToError();
                return;
            }

            submitting.value = true;

            try {
                const submitData = {
                    ...form,
                    unified_social_credit_code: form.unified_social_credit_code.toUpperCase(),
                    other_certificates: form.other_certificates.map(c => ({
                        name: c.name,
                        url: c.url,
                        original_name: c.original_name
                    }))
                };

                const response = await fetch(`${API_BASE}/register.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(submitData)
                });

                const result = await response.json();

                if (result.code === 200) {
                    clearKybCache(result.data.id);
                    submitSuccess.value = true;
                    submitFailed.value = false;
                    try {
                        sessionStorage.setItem('lastKybId', result.data.id);
                        sessionStorage.setItem('justSavedKyb', '1');
                    } catch (e) {}
                    
                    if (!isEditMode.value) {
                        setTimeout(() => {
                            location.href = 'list.html';
                        }, 2000);
                    }
                } else {
                    submitFailedMessage.value = result.message || '提交失败，请检查输入后重试';
                    submitFailed.value = true;
                    
                    const field = mapBackendErrorToField(result.message || '');
                    if (field) {
                        showFieldError(field, result.message);
                    } else {
                        if (result.code === 400 && result.message && result.message.includes('已通过审核')) {
                            canEdit.value = false;
                            globalError.value = result.message;
                        } else {
                            globalError.value = result.message || '提交失败，请检查输入后重试';
                        }
                    }
                    scrollToError();
                }
            } catch (error) {
                console.error('提交失败:', error);
                const errMsg = '提交失败，请稍后重试。\n注意：需部署 PHP + MySQL 环境后才能正常提交到数据库。';
                globalError.value = errMsg;
                submitFailedMessage.value = errMsg;
                submitFailed.value = true;
                scrollToError();
            } finally {
                submitting.value = false;
            }
        }

        function resetForm() {
            submitSuccess.value = false;
            submitFailed.value = false;
            submitFailedMessage.value = '';
            currentStep.value = 1;
            agreed.value = false;
            globalError.value = '';
            canEdit.value = true;
            isEditMode.value = false;
            editId.value = 0;
            editStatus.value = 0;
            pageTitle.value = '供应商资质认证';
            pageSubtitle.value = 'KYB (Know Your Business) 企业信息注册';
            Object.keys(form).forEach(key => {
                if (key === 'other_certificates') {
                    form[key] = [];
                } else {
                    form[key] = '';
                }
            });
            Object.keys(errors).forEach(key => delete errors[key]);
            Object.keys(uploadErrors).forEach(key => delete uploadErrors[key]);
            clearKybCache();
        }

        function closeFailedModal() {
            submitFailed.value = false;
        }

        function retrySubmit() {
            submitFailed.value = false;
            handleSubmit();
        }

        async function loadEditData(id) {
            if (!id || id <= 0) return;
            
            try {
                const response = await fetch(`${API_BASE}/detail.php?id=${id}`);
                const result = await response.json();
                
                if (result.code === 200) {
                    const data = result.data;
                    isEditMode.value = true;
                    editId.value = id;
                    editStatus.value = data.status;
                    pageTitle.value = '编辑供应商资质';
                    pageSubtitle.value = `当前状态：${statusTextMap[data.status] || '未知'}`;
                    
                    canEdit.value = data.status != 1;
                    
                    Object.keys(form).forEach(key => {
                        if (key === 'other_certificates') {
                            form[key] = data[key] && Array.isArray(data[key]) ? [...data[key]] : [];
                        } else if (data.hasOwnProperty(key)) {
                            form[key] = data[key] || '';
                        }
                    });
                    
                    if (!canEdit.value) {
                        globalError.value = '该企业已通过审核，资料不可修改。如需修改请联系客服。';
                    }
                } else {
                    globalError.value = result.message || '加载编辑数据失败';
                }
            } catch (e) {
                console.error('加载编辑数据失败:', e);
                globalError.value = '加载编辑数据失败，请刷新页面重试';
            }
        }

        function checkEditMode() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const editIdParam = urlParams.get('edit');
                if (editIdParam) {
                    const id = parseInt(editIdParam);
                    if (id > 0) {
                        loadEditData(id);
                        return;
                    }
                }
                
                const sessionEditId = sessionStorage.getItem('editKybId');
                if (sessionEditId) {
                    const id = parseInt(sessionEditId);
                    if (id > 0) {
                        sessionStorage.removeItem('editKybId');
                        loadEditData(id);
                    }
                }
            } catch (e) {}
        }

        onMounted(() => {
            checkEditMode();
        });

        return {
            currentStep,
            form,
            errors,
            uploadErrors,
            globalError,
            provinces,
            cities,
            fullAddress,
            submitting,
            submitSuccess,
            submitFailed,
            submitFailedMessage,
            agreed,
            isEditMode,
            editId,
            editStatus,
            canEdit,
            pageTitle,
            pageSubtitle,
            businessLicenseInput,
            idFrontInput,
            idBackInput,
            nextStep,
            prevStep,
            triggerUpload,
            handleFileUpload,
            removeFile,
            isImage,
            addOtherCert,
            removeOtherCert,
            triggerOtherUpload,
            handleOtherFileUpload,
            handleSubmit,
            resetForm,
            closeFailedModal,
            retrySubmit
        };
    }
}).mount('#app');
