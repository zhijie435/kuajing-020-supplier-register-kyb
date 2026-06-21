const { createApp, reactive, ref, computed, onMounted, nextTick } = Vue;

const API_BASE = '../backend/api';
const STORAGE_KEY = 'kyb_list_filters_v1';

const MOCK_DATA = [
    {
        id: 1, company_name: '北京科技发展有限公司', unified_social_credit_code: '91110108MA01ABCD23',
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
        upload_count: 0, total_upload_count: 5, upload_progress: 0
    },
    {
        id: 2, company_name: '上海贸易有限公司', unified_social_credit_code: '91310000MA1FL6X789',
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
        upload_count: 1, total_upload_count: 3, upload_progress: 33
    },
    {
        id: 3, company_name: '广州制造集团', unified_social_credit_code: '91440100MA59B3CDEF',
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
        upload_count: 4, total_upload_count: 5, upload_progress: 80
    },
    {
        id: 4, company_name: '深圳创新科技有限公司', unified_social_credit_code: '91440300MA5D8FGH12',
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
            { name: '软件著作权', url: 'https://example.com/certs/copyright.jpg' }
        ],
        status: 0, status_text: '待审核', remark: '',
        created_at: '2026-06-21 16:00:00', updated_at: '2026-06-21 16:00:00',
        upload_count: 5, total_upload_count: 5, upload_progress: 100
    },
    {
        id: 5, company_name: '杭州电商服务有限公司', unified_social_credit_code: '91330100MA27IJKL45',
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
        upload_count: 3, total_upload_count: 3, upload_progress: 100
    }
];

function computeUploadStats(item) {
    let uploadCount = 0;
    let totalCount = 3;
    if (!item.business_license || item.business_license === '') {
    } else { uploadCount++; }
    if (item.legal_person_id_front && item.legal_person_id_front !== '') uploadCount++;
    if (item.legal_person_id_back && item.legal_person_id_back !== '') uploadCount++;
    if (item.organization_code_cert && item.organization_code_cert !== '') {
        uploadCount++; totalCount++;
    }
    if (item.tax_registration_cert && item.tax_registration_cert !== '') {
        uploadCount++; totalCount++;
    }
    if (item.other_certificates && Array.isArray(item.other_certificates) && item.other_certificates.length > 0) {
        uploadCount += item.other_certificates.length;
        totalCount += item.other_certificates.length;
    }
    return {
        upload_count: uploadCount,
        total_upload_count: totalCount,
        upload_progress: totalCount > 0 ? Math.round(uploadCount / totalCount * 100) : 0
    };
}
