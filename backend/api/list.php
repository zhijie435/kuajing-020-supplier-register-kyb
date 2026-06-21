<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, '请求方法不允许');
}

$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$pageSize = isset($_GET['pageSize']) ? min(100, max(1, intval($_GET['pageSize']))) : 10;
$status = isset($_GET['status']) ? intval($_GET['status']) : null;
$keyword = isset($_GET['keyword']) ? trim($_GET['keyword']) : '';
$offset = ($page - 1) * $pageSize;

try {
    $pdo = get_db_connection();
    
    $where = ['1=1'];
    $params = [];
    
    if ($status !== null && in_array($status, [0, 1, 2])) {
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
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    $sql = "SELECT id, company_name, unified_social_credit_code, legal_person, 
                   contact_name, contact_phone, status, remark, created_at, updated_at
            FROM supplier_kyb 
            WHERE $whereClause 
            ORDER BY id DESC 
            LIMIT $offset, $pageSize";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $list = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($list as &$item) {
        $statusText = ['待审核', '审核通过', '审核拒绝'];
        $item['status_text'] = $statusText[$item['status']] ?? '未知';
    }
    
    json_response(200, '查询成功', [
        'list' => $list,
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => ceil($total / $pageSize)
        ]
    ]);
    
} catch (PDOException $e) {
    json_response(500, '服务器错误: ' . $e->getMessage());
}
