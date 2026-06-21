<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(ERR_METHOD_NOT_ALLOWED, '请求方法不允许');
}

$user = require_authenticated();

$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$pageSize = isset($_GET['pageSize']) ? min(100, max(1, intval($_GET['pageSize']))) : 10;
$status = isset($_GET['status']) ? intval($_GET['status']) : null;
$keyword = isset($_GET['keyword']) ? trim($_GET['keyword']) : '';
$offset = ($page - 1) * $pageSize;

$pdo = get_db_connection();

$where = ['1=1'];
$params = [];

if ($user['role'] === ROLE_SUPPLIER) {
    if (!empty($user['supplier_id'])) {
        $where[] = 'id = ?';
        $params[] = $user['supplier_id'];
    } else {
        $where[] = '0 = 1';
    }
}

if ($status !== null && in_array($status, [0, 1, 2], true)) {
    $where[] = 'status = ?';
    $params[] = $status;
}

if (!empty($keyword)) {
    $where[] = '(company_name LIKE ? OR unified_social_credit_code LIKE ? OR contact_name LIKE ?)';
    $keywordParam = "%$keyword%";
    $params[] = $keywordParam;
    $params[] = $keywordParam;
    $params[] = $keywordParam;
}

$whereClause = implode(' AND ', $where);

$countSql = "SELECT COUNT(*) as total FROM supplier_kyb WHERE $whereClause";
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$total = intval($stmt->fetchColumn());

if ($total === 0) {
    json_response(ERR_OK, '查询成功', [
        'list' => [],
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => 0,
            'totalPages' => 0,
        ],
        'meta' => [
            'can_review' => can_review_supplier_kyb(),
            'current_role' => $user['role'],
        ],
    ]);
}

$sql = "SELECT id, company_name, unified_social_credit_code, legal_person, 
               contact_name, contact_phone, status, remark, created_at, updated_at
        FROM supplier_kyb 
        WHERE $whereClause 
        ORDER BY id DESC 
        LIMIT $offset, $pageSize";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$list = $stmt->fetchAll();

foreach ($list as &$item) {
    $item['status_text'] = get_kyb_status_text($item['status']);
    $item['can_view'] = can_view_supplier_kyb($item['id']);
    $item['can_edit'] = can_edit_supplier_kyb($item['id'], $item['status']);
}
unset($item);

json_response(ERR_OK, '查询成功', [
    'list' => $list,
    'pagination' => [
        'page' => $page,
        'pageSize' => $pageSize,
        'total' => $total,
        'totalPages' => (int)ceil($total / $pageSize),
    ],
    'meta' => [
        'can_review' => can_review_supplier_kyb(),
        'current_role' => $user['role'],
    ],
]);
