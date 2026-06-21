<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, '请求方法不允许');
}

$input = json_decode(file_get_contents('php://input'), true);

$id = isset($input['id']) ? intval($input['id']) : 0;
if ($id <= 0) {
    json_response(400, '无效的ID');
}

$status = isset($input['status']) ? intval($input['status']) : -1;
if (!in_array($status, [1, 2], true)) {
    json_response(400, '审核状态值无效，仅支持 1(通过) 或 2(拒绝)');
}

$remark = isset($input['remark']) ? trim($input['remark']) : '';

try {
    $pdo = get_db_connection();
    
    $checkSql = "SELECT id, status, business_license, legal_person_id_front, legal_person_id_back 
                FROM supplier_kyb WHERE id = ? FOR UPDATE";
    $stmt = $pdo->prepare($checkSql);
    $stmt->execute([$id]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        json_response(404, '记录不存在');
    }
    
    if ($record['status'] != 0) {
        $statusText = ['待审核', '审核通过', '审核拒绝'];
        json_response(400, '该记录已完成审核（当前状态：' . ($statusText[$record['status']] ?? '未知') . '），不能重复审核');
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
            json_response(400, '证照上传不完整，缺少：' . implode('、', $missingFiles) . '。请确保证照全部上传后再审核通过。');
        }
    }
    
    $pdo->beginTransaction();
    
    try {
        $updateSql = "UPDATE supplier_kyb SET status = ?, remark = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $pdo->prepare($updateSql);
        $result = $stmt->execute([$status, $remark, $id]);
        
        if (!$result) {
            throw new Exception('数据库更新失败');
        }
        
        $freshSql = "SELECT id, status, remark, updated_at FROM supplier_kyb WHERE id = ?";
        $stmt = $pdo->prepare($freshSql);
        $stmt->execute([$id]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $pdo->commit();
        
        $statusMap = [
            1 => '审核通过',
            2 => '审核拒绝'
        ];
        
        $updated['status_text'] = $statusMap[$status];
        
        json_response(200, '审核操作成功，状态已回写', $updated);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    json_response(500, '服务器错误: ' . $e->getMessage());
} catch (Exception $e) {
    json_response(500, $e->getMessage());
}
