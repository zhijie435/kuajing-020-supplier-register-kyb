<?php
require_once __DIR__ . '/../config/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(ERR_METHOD_NOT_ALLOWED, '请求方法不允许');
}

require_authenticated();

if (!isset($_FILES['file'])) {
    json_response(ERR_BAD_REQUEST, '请上传有效的文件');
}

$file = $_FILES['file'];

check_upload_error($file['error']);

$allowedMimeTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'application/pdf' => 'pdf',
];

$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];

$maxSize = 10 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    json_response(ERR_BAD_REQUEST, '文件大小不能超过 10MB');
}

if ($file['size'] <= 0) {
    json_response(ERR_BAD_REQUEST, '文件内容为空');
}

if (!isset($allowedMimeTypes[$file['type']])) {
    json_response(ERR_BAD_REQUEST, '不支持的文件类型，仅支持 JPG、PNG、GIF、PDF');
}

$originalExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($originalExtension, $allowedExtensions, true)) {
    json_response(ERR_BAD_REQUEST, '不支持的文件扩展名，仅支持 JPG、PNG、GIF、PDF');
}

if (!is_uploaded_file($file['tmp_name'])) {
    log_error('File upload security check failed: not an uploaded file', [
        'filename' => $file['name'],
        'tmp_name' => $file['tmp_name'],
    ]);
    json_response(ERR_BAD_REQUEST, '文件上传异常，请重新上传');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$detectedMime = $finfo->file($file['tmp_name']);
if (!isset($allowedMimeTypes[$detectedMime])) {
    log_error('File upload security check failed: mime type mismatch', [
        'filename' => $file['name'],
        'declared_mime' => $file['type'],
        'detected_mime' => $detectedMime,
    ]);
    json_response(ERR_BAD_REQUEST, '文件内容与类型不匹配，请上传真实的图片或PDF文件');
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0755, true)) {
        log_error('Failed to create upload directory', ['dir' => $uploadDir]);
        json_response(ERR_INTERNAL, '上传目录创建失败，请联系管理员');
    }
}

if (!is_writable($uploadDir)) {
    log_error('Upload directory is not writable', ['dir' => $uploadDir]);
    json_response(ERR_INTERNAL, '上传目录不可写，请联系管理员');
}

$allowedTypes = ['business_license', 'legal_person_id_front', 'legal_person_id_back', 'other'];
$type = isset($_POST['type']) ? trim($_POST['type']) : 'other';
if (!in_array($type, $allowedTypes, true)) {
    $type = 'other';
}

$safeExtension = $allowedMimeTypes[$detectedMime];
$fileName = $type . '_' . date('YmdHis') . '_' . uniqid('', true) . '.' . $safeExtension;
$filePath = $uploadDir . $fileName;

if (file_exists($filePath)) {
    $fileName = $type . '_' . date('YmdHis') . '_' . uniqid('', true) . '_' . mt_rand(1000, 9999) . '.' . $safeExtension;
    $filePath = $uploadDir . $fileName;
}

if (!@move_uploaded_file($file['tmp_name'], $filePath)) {
    log_error('Failed to move uploaded file', [
        'tmp_name' => $file['tmp_name'],
        'target' => $filePath,
    ]);
    json_response(ERR_INTERNAL, '文件保存失败，请重新上传');
}

@chmod($filePath, 0644);

$relativePath = 'backend/uploads/' . $fileName;

json_response(ERR_OK, '上传成功', [
    'url' => $relativePath,
    'name' => $file['name'],
    'size' => $file['size'],
    'type' => $detectedMime,
    'extension' => $safeExtension,
]);
