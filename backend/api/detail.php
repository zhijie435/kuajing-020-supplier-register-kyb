<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(ERR_METHOD_NOT_ALLOWED, '请求方法不允许');
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    json_response(ERR_BAD_REQUEST, '无效的ID');
}

$pdo = get_db_connection();

$sql = "SELECT * FROM supplier_kyb WHERE id = ? LIMIT 1";
$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);
$detail = $stmt->fetch();

if (!$detail) {
    json_response(ERR_NOT_FOUND, '记录不存在');
}

require_view_permission($detail['id']);

$detail = format_kyb_record($detail);

$user = get_current_user();
$detail['can_view'] = can_view_supplier_kyb($detail['id']);
$detail['can_edit'] = can_edit_supplier_kyb($detail['id'], $detail['status']);
$detail['can_review'] = can_review_supplier_kyb();
$detail['current_role'] = $user['role'];

json_response(ERR_OK, '查询成功', $detail);
