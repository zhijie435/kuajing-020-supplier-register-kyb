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
    $pdo->beginTransaction();
    
    $creditCode = $input['unified_social_credit_code'];
    
    $checkSql = "SELECT id, status FROM supplier_kyb WHERE unified_social_credit_code = ? FOR UPDATE";
    $stmt = $pdo->prepare($checkSql);
    $stmt->execute([$creditCode]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $otherCerts = !empty($input['other_certificates']) ? json_encode($input['other_certificates'], JSON_UNESCAPED_UNICODE) : null;
    
    if ($existing) {
        if ($existing['status'] == 1) {
            $pdo->rollBack();
            json_response(400, '该企业已通过审核，无需重复提交');
        }
        
        $sql = "UPDATE supplier_kyb SET
            company_name = ?,
            legal_person = ?,
            legal_person_id_card = ?,
            registered_capital = ?,
            establish_date = ?,
            business_scope = ?,
            registered_address_province = ?,
            registered_address_city = ?,
            registered_address_district = ?,
            registered_address_detail = ?,
            contact_name = ?,
            contact_phone = ?,
            contact_email = ?,
            business_license = ?,
            legal_person_id_front = ?,
            legal_person_id_back = ?,
            other_certificates = ?,
            status = 0,
            remark = NULL,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $input['company_name'],
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
            $otherCerts,
            $existing['id']
        ]);
        
        $recordId = $existing['id'];
        $isNew = false;
    } else {
        $sql = "INSERT INTO supplier_kyb (
            company_name, unified_social_credit_code, legal_person, legal_person_id_card,
            registered_capital, establish_date, business_scope,
            registered_address_province, registered_address_city, registered_address_district, registered_address_detail,
            contact_name, contact_phone, contact_email,
            business_license, legal_person_id_front, legal_person_id_back, other_certificates,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $input['company_name'],
            $creditCode,
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
        
        $recordId = $pdo->lastInsertId();
        $isNew = true;
    }
    
    if ($result) {
        $pdo->commit();
        
        $queryStmt = $pdo->prepare("SELECT * FROM supplier_kyb WHERE id = ?");
        $queryStmt->execute([$recordId]);
        $record = $queryStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!empty($record['other_certificates'])) {
            $record['other_certificates'] = json_decode($record['other_certificates'], true) ?: [];
        } else {
            $record['other_certificates'] = [];
        }
        
        $fullAddress = $record['registered_address_province'] . 
                       $record['registered_address_city'] . 
                       $record['registered_address_district'] . 
                       $record['registered_address_detail'];
        $record['full_address'] = trim($fullAddress);
        
        $statusText = ['待审核', '审核通过', '审核拒绝'];
        $record['status_text'] = $statusText[$record['status']] ?? '未知';
        $record['is_new'] = $isNew;
        $record['can_edit'] = $record['status'] != 1;
        
        json_response(200, $isNew ? '注册提交成功，请等待审核' : '资料已更新，重新进入审核队列', $record);
    } else {
        $pdo->rollBack();
        json_response(500, '注册提交失败');
    }
    
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_response(500, '服务器错误: ' . $e->getMessage());
}
