<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, '请求方法不允许');
}

$input = json_decode(file_get_contents('php://input'), true);

$requiredFields = ['company_name', 'unified_social_credit_code', 'legal_person', 'contact_name', 'contact_phone'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        json_response(400, '请填写完整的必填项：' . $field);
    }
}

if (!preg_match('/^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/', $input['unified_social_credit_code'])) {
    json_response(400, '统一社会信用代码格式不正确');
}

if (!preg_match('/^1[3-9]\d{9}$/', $input['contact_phone'])) {
    json_response(400, '联系电话格式不正确');
}

if (!empty($input['contact_email']) && !filter_var($input['contact_email'], FILTER_VALIDATE_EMAIL)) {
    json_response(400, '邮箱格式不正确');
}

try {
    $pdo = get_db_connection();
    
    $checkSql = "SELECT id FROM supplier_kyb WHERE unified_social_credit_code = ?";
    $stmt = $pdo->prepare($checkSql);
    $stmt->execute([$input['unified_social_credit_code']]);
    if ($stmt->fetch()) {
        json_response(400, '该统一社会信用代码已提交过注册');
    }
    
    $sql = "INSERT INTO supplier_kyb (
        company_name, unified_social_credit_code, legal_person, legal_person_id_card,
        registered_capital, establish_date, business_scope,
        registered_address_province, registered_address_city, registered_address_district, registered_address_detail,
        contact_name, contact_phone, contact_email,
        business_license, legal_person_id_front, legal_person_id_back, other_certificates
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $otherCerts = !empty($input['other_certificates']) ? json_encode($input['other_certificates'], JSON_UNESCAPED_UNICODE) : null;
    
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        $input['company_name'],
        $input['unified_social_credit_code'],
        $input['legal_person'],
        $input['legal_person_id_card'] ?? null,
        $input['registered_capital'] ?? null,
        $input['establish_date'] ?? null,
        $input['business_scope'] ?? null,
        $input['registered_address_province'] ?? null,
        $input['registered_address_city'] ?? null,
        $input['registered_address_district'] ?? null,
        $input['registered_address_detail'] ?? null,
        $input['contact_name'],
        $input['contact_phone'],
        $input['contact_email'] ?? null,
        $input['business_license'] ?? null,
        $input['legal_person_id_front'] ?? null,
        $input['legal_person_id_back'] ?? null,
        $otherCerts
    ]);
    
    if ($result) {
        json_response(200, '注册提交成功，请等待审核', [
            'id' => $pdo->lastInsertId()
        ]);
    } else {
        json_response(500, '注册提交失败');
    }
    
} catch (PDOException $e) {
    json_response(500, '服务器错误: ' . $e->getMessage());
}
