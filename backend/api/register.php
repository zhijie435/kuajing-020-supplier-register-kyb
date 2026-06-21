<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(ERR_METHOD_NOT_ALLOWED, '请求方法不允许');
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false || $rawInput === '') {
    json_response(ERR_BAD_REQUEST, '请求体为空');
}

$input = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    json_response(ERR_BAD_REQUEST, 'JSON格式解析失败：' . json_last_error_msg());
}

if (!is_array($input)) {
    json_response(ERR_BAD_REQUEST, '请求数据格式无效');
}

$input = sanitize_input($input);

$requiredFields = ['company_name', 'unified_social_credit_code', 'legal_person', 'contact_name', 'contact_phone'];
validate_required($input, $requiredFields);

validate_unified_social_credit_code($input['unified_social_credit_code']);
validate_phone($input['contact_phone']);
validate_email($input['contact_email'] ?? '');

$input['company_name'] = trim($input['company_name']);
$input['legal_person'] = trim($input['legal_person']);
$input['contact_name'] = trim($input['contact_name']);
if (isset($input['contact_email'])) {
    $input['contact_email'] = trim($input['contact_email']);
}

if (isset($input['other_certificates']) && !empty($input['other_certificates'])) {
    if (!is_array($input['other_certificates'])) {
        json_response(ERR_BAD_REQUEST, '其他证照数据格式无效');
    }
    foreach ($input['other_certificates'] as $idx => $cert) {
        if (!is_array($cert) || empty($cert['url']) || empty($cert['name'])) {
            json_response(ERR_BAD_REQUEST, '第' . ($idx + 1) . '个其他证照数据不完整');
        }
    }
}

$pdo = get_db_connection();
$pdo->beginTransaction();

try {
    $creditCode = $input['unified_social_credit_code'];

    $checkSql = "SELECT id, status FROM supplier_kyb WHERE unified_social_credit_code = ? LIMIT 1 FOR UPDATE";
    $stmt = $pdo->prepare($checkSql);
    $stmt->execute([$creditCode]);
    $existing = $stmt->fetch();

    $otherCerts = !empty($input['other_certificates'])
        ? json_encode($input['other_certificates'], JSON_UNESCAPED_UNICODE)
        : null;

    if ($existing) {
        if ($existing['status'] == 1) {
            $pdo->rollBack();
            json_response(ERR_BAD_REQUEST, '该企业已通过审核，无需重复提交');
        }

        require_edit_permission($existing['id'], $existing['status']);

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
            $existing['id'],
        ]);

        if (!$result) {
            throw new Exception('数据库更新失败');
        }

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
            $otherCerts,
        ]);

        if (!$result) {
            throw new Exception('数据库插入失败');
        }

        $recordId = (int)$pdo->lastInsertId();
        $isNew = true;
    }

    $queryStmt = $pdo->prepare("SELECT * FROM supplier_kyb WHERE id = ? LIMIT 1");
    $queryStmt->execute([$recordId]);
    $record = $queryStmt->fetch();

    if (!$record) {
        throw new Exception('记录查询失败');
    }

    $record = format_kyb_record($record);
    $record['is_new'] = $isNew;
    $record['can_edit'] = can_edit_supplier_kyb($record['id'], $record['status']);
    $record['can_view'] = can_view_supplier_kyb($record['id']);

    $pdo->commit();

    $message = $isNew ? '注册提交成功，请等待审核' : '资料已更新，重新进入审核队列';
    json_response(ERR_OK, $message, $record);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e instanceof PDOException) {
        log_error('Register database error: ' . $e->getMessage(), [
            'credit_code' => $creditCode ?? '',
            'code' => $e->getCode(),
        ]);
        json_response(ERR_INTERNAL, '系统繁忙，请稍后重试');
    }
    log_error('Register error: ' . $e->getMessage(), [
        'credit_code' => $creditCode ?? '',
        'trace' => $e->getTraceAsString(),
    ]);
    json_response(ERR_INTERNAL, $e->getMessage());
}
