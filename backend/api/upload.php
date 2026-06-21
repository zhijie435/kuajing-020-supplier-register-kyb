<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, '请求方法不允许');
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    json_response(400, '请上传有效的文件');
}

$file = $_FILES['file'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
$maxSize = 10 * 1024 * 1024;

if (!in_array($file['type'], $allowedTypes)) {
    json_response(400, '不支持的文件类型，仅支持 JPG、PNG、GIF、PDF');
}

if ($file['size'] > $maxSize) {
    json_response(400, '文件大小不能超过 10MB');
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$type = isset($_POST['type']) ? $_POST['type'] : 'other';
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = $type . '_' . time() . '_' . uniqid() . '.' . $extension;
$filePath = $uploadDir . $fileName;

if (move_uploaded_file($file['tmp_name'], $filePath)) {
    $relativePath = 'backend/uploads/' . $fileName;
    json_response(200, '上传成功', [
        'url' => $relativePath,
        'name' => $file['name'],
        'size' => $file['size'],
        'type' => $file['type']
    ]);
} else {
    json_response(500, '文件上传失败');
}
