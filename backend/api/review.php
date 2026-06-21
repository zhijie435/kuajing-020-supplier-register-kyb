<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(ERR_METHOD_NOT_ALLOWED, '请求方法不允许');
}

require_review_permission();

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

$id = isset($input['id']) ? intval($input['id']) : 0;
if ($id <= 0) {
    json_response(ERR_BAD_REQUEST, '无效的ID');
}

$status = isset($input['status']) ? intval($input['status']) : -1;
if (!in_array($status, [1, 2], true)) {
    json_response(ERR_BAD_REQUEST, '审核状态值无效，仅支持 1(通过) 或 2(拒绝)');
}

$remark = isset($input['remark']) ? trim($input['remark']) : '';

if ($status == 2 && empty($remark)) {
    json_response(ERR_BAD_REQUEST, '审核拒绝时必须填写拒绝原因');
}

if (!empty($remark) && mb_strlen($remark) > 500) {
    json_response(ERR_BAD_REQUEST, '审核备注不能超过500个字符');
}

$pdo = get_db_connection();
$pdo->beginTransaction();

try {
    $checkSql = "SELECT id, status, business_license, legal_person_id_front, legal_person_id_back 
                FROM supplier_kyb WHERE id = ? LIMIT 1 FOR UPDATE";
    $stmt = $pdo->prepare($checkSql);
    $stmt->execute([$id]);
    $record = $stmt->fetch();

    if (!$record) {
        $pdo->rollBack();
        json_response(ERR_NOT_FOUND, '记录不存在');
    }

    if ($record['status'] != 0) {
        $pdo->rollBack();
        $statusText = get_kyb_status_text($record['status']);
        json_response(ERR_BAD_REQUEST, '该记录已完成审核（当前状态：' . $statusText . '），不能重复审核');
    }

    if ($status == 1) {
        $missingFiles = [];
        if (empty($record['business_license'])) {
            $missingFiles[] = '营业执照';
        }
        if (empty($record['legal_person_id_front'])) {
            $missingFiles[] = '法人身份证正面';
        }
        if (empty($record['legal_person_id_back'])) {
            $missingFiles[] = '法人身份证反面';
        }

        if (!empty($missingFiles)) {
            $pdo->rollBack();
            json_response(ERR_BAD_REQUEST, '证照上传不完整，缺少：' . implode('、', $missingFiles) . '。请确保证照全部上传后再审核通过。');
        }
    }

    $updateSql = "UPDATE supplier_kyb SET status = ?, remark = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($updateSql);
    $result = $stmt->execute([$status, $remark, $id]);

    if (!$result) {
        throw new Exception('数据库更新失败');
    }

    $freshSql = "SELECT * FROM supplier_kyb WHERE id = ? LIMIT 1";
    $stmt = $pdo->prepare($freshSql);
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    if (!$updated) {
        throw new Exception('更新后的记录查询失败');
    }

    $updated = format_kyb_record($updated);

    $pdo->commit();

    json_response(ERR_OK, '审核操作成功，状态已回写', $updated);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e instanceof PDOException) {
        log_error('Review database error: ' . $e->getMessage(), [
            'record_id' => $id,
            'target_status' => $status,
            'code' => $e->getCode(),
        ]);
        json_response(ERR_INTERNAL, '系统繁忙，请稍后重试');
    }
    log_error('Review error: ' . $e->getMessage(), [
        'record_id' => $id,
        'target_status' => $status,
        'trace' => $e->getTraceAsString(),
    ]);
    json_response(ERR_INTERNAL, $e->getMessage());
}
