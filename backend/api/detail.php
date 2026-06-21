<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, '请求方法不允许');
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    json_response(400, '无效的ID');
}

try {
    $pdo = get_db_connection();
    
    $sql = "SELECT * FROM supplier_kyb WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    $detail = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$detail) {
        json_response(404, '记录不存在');
    }
    
    if (!empty($detail['other_certificates'])) {
        $detail['other_certificates'] = json_decode($detail['other_certificates'], true) ?: [];
    } else {
        $detail['other_certificates'] = [];
    }
    
    $statusText = ['待审核', '审核通过', '审核拒绝'];
    $detail['status_text'] = $statusText[$detail['status']] ?? '未知';
    
    $fullAddress = $detail['registered_address_province'] . 
                   $detail['registered_address_city'] . 
                   $detail['registered_address_district'] . 
                   $detail['registered_address_detail'];
    $detail['full_address'] = trim($fullAddress);
    
    json_response(200, '查询成功', $detail);
    
} catch (PDOException $e) {
    json_response(500, '服务器错误: ' . $e->getMessage());
}
