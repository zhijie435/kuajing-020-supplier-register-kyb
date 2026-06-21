<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('ROLE_SUPPLIER', 'supplier');
define('ROLE_ADMIN', 'admin');
define('ROLE_GUEST', 'guest');

define('ERR_OK', 200);
define('ERR_BAD_REQUEST', 400);
define('ERR_UNAUTHORIZED', 401);
define('ERR_FORBIDDEN', 403);
define('ERR_NOT_FOUND', 404);
define('ERR_METHOD_NOT_ALLOWED', 405);
define('ERR_INTERNAL', 500);

function json_response($code, $message, $data = null)
{
    $isSuccess = $code >= 200 && $code < 300;
    echo json_encode([
        'code' => $code,
        'success' => $isSuccess,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function get_db_connection()
{
    $host = getenv('DB_HOST') ?: 'localhost';
    $dbname = getenv('DB_NAME') ?: 'course_edu';
    $username = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASS') ?: '';

    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        return $pdo;
    } catch (PDOException $e) {
        log_error('Database connection failed: ' . $e->getMessage());
        json_response(ERR_INTERNAL, '系统繁忙，请稍后重试');
    }
}

function get_current_user()
{
    static $currentUser = null;
    if ($currentUser !== null) {
        return $currentUser;
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        $currentUser = [
            'id' => 0,
            'role' => ROLE_GUEST,
            'supplier_id' => null,
        ];
        return $currentUser;
    }

    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
    } else {
        $token = $authHeader;
    }

    if (empty($token)) {
        $currentUser = [
            'id' => 0,
            'role' => ROLE_GUEST,
            'supplier_id' => null,
        ];
        return $currentUser;
    }

    try {
        $parts = explode('.', base64_decode($token));
        if (count($parts) >= 3) {
            list($userId, $role, $supplierId) = $parts + [0, 0, ROLE_GUEST, null];
            $currentUser = [
                'id' => intval($userId),
                'role' => in_array($role, [ROLE_SUPPLIER, ROLE_ADMIN]) ? $role : ROLE_GUEST,
                'supplier_id' => $supplierId ? intval($supplierId) : null,
            ];
        } else {
            $currentUser = [
                'id' => 0,
                'role' => ROLE_GUEST,
                'supplier_id' => null,
            ];
        }
    } catch (Exception $e) {
        $currentUser = [
            'id' => 0,
            'role' => ROLE_GUEST,
            'supplier_id' => null,
        ];
    }

    return $currentUser;
}

function require_authenticated()
{
    $user = get_current_user();
    if ($user['role'] === ROLE_GUEST) {
        json_response(ERR_UNAUTHORIZED, '请先登录');
    }
    return $user;
}

function require_role($allowedRoles)
{
    $user = require_authenticated();
    if (!is_array($allowedRoles)) {
        $allowedRoles = [$allowedRoles];
    }
    if (!in_array($user['role'], $allowedRoles, true)) {
        json_response(ERR_FORBIDDEN, '权限不足，无法执行此操作');
    }
    return $user;
}

function can_view_supplier_kyb($recordId = null)
{
    $user = get_current_user();

    if ($user['role'] === ROLE_ADMIN) {
        return true;
    }

    if ($user['role'] === ROLE_SUPPLIER && $recordId !== null) {
        return $user['supplier_id'] === intval($recordId);
    }

    return false;
}

function can_edit_supplier_kyb($recordId = null, $currentStatus = null)
{
    $user = get_current_user();

    if ($user['role'] === ROLE_ADMIN) {
        return true;
    }

    if ($user['role'] === ROLE_SUPPLIER && $recordId !== null) {
        if ($user['supplier_id'] !== intval($recordId)) {
            return false;
        }
        if ($currentStatus !== null && intval($currentStatus) === 1) {
            return false;
        }
        return true;
    }

    return false;
}

function can_review_supplier_kyb()
{
    $user = get_current_user();
    return $user['role'] === ROLE_ADMIN;
}

function require_view_permission($recordId = null)
{
    if (!can_view_supplier_kyb($recordId)) {
        if (get_current_user()['role'] === ROLE_GUEST) {
            json_response(ERR_UNAUTHORIZED, '请先登录');
        }
        json_response(ERR_FORBIDDEN, '没有权限查看此记录');
    }
}

function require_edit_permission($recordId = null, $currentStatus = null)
{
    if (!can_edit_supplier_kyb($recordId, $currentStatus)) {
        if (get_current_user()['role'] === ROLE_GUEST) {
            json_response(ERR_UNAUTHORIZED, '请先登录');
        }
        if ($currentStatus !== null && intval($currentStatus) === 1) {
            json_response(ERR_FORBIDDEN, '该记录已通过审核，不可修改');
        }
        json_response(ERR_FORBIDDEN, '没有权限修改此记录');
    }
}

function require_review_permission()
{
    if (!can_review_supplier_kyb()) {
        if (get_current_user()['role'] === ROLE_GUEST) {
            json_response(ERR_UNAUTHORIZED, '请先登录');
        }
        json_response(ERR_FORBIDDEN, '只有管理员可以执行审核操作');
    }
}

function sanitize_input($data)
{
    if (is_array($data)) {
        return array_map('sanitize_input', $data);
    }
    if (is_string($data)) {
        $data = trim($data);
        $data = stripslashes($data);
        return $data;
    }
    return $data;
}

function validate_required($input, $fields)
{
    $missing = [];
    foreach ($fields as $field) {
        if (empty($input[$field]) && $input[$field] !== '0' && $input[$field] !== 0) {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        json_response(ERR_BAD_REQUEST, '请填写完整的必填项：' . implode('、', $missing));
    }
}

function validate_unified_social_credit_code($code)
{
    if (!preg_match('/^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/', $code)) {
        json_response(ERR_BAD_REQUEST, '统一社会信用代码格式不正确');
    }
}

function validate_phone($phone)
{
    if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
        json_response(ERR_BAD_REQUEST, '联系电话格式不正确');
    }
}

function validate_email($email)
{
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(ERR_BAD_REQUEST, '邮箱格式不正确');
    }
}

function log_error($message, $context = [])
{
    $logDir = __DIR__ . '/../logs/';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'message' => $message,
        'context' => $context,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? '',
    ];

    $logFile = $logDir . 'error_' . date('Y-m-d') . '.log';
    @file_put_contents($logFile, json_encode($logEntry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
}

function handle_exception($e)
{
    if ($e instanceof PDOException) {
        log_error('Database error: ' . $e->getMessage(), [
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        json_response(ERR_INTERNAL, '系统繁忙，请稍后重试');
    }

    if ($e instanceof InvalidArgumentException) {
        json_response(ERR_BAD_REQUEST, $e->getMessage());
    }

    log_error('Unhandled exception: ' . $e->getMessage(), [
        'code' => $e->getCode(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
    ]);

    json_response(ERR_INTERNAL, '系统繁忙，请稍后重试');
}

set_exception_handler('handle_exception');

function get_kyb_status_text($status)
{
    $statusMap = [0 => '待审核', 1 => '审核通过', 2 => '审核拒绝'];
    return $statusMap[intval($status)] ?? '未知';
}

function format_kyb_address($record)
{
    $fullAddress = ($record['registered_address_province'] ?? '') .
        ($record['registered_address_city'] ?? '') .
        ($record['registered_address_district'] ?? '') .
        ($record['registered_address_detail'] ?? '');
    return trim($fullAddress);
}

function parse_other_certificates($raw)
{
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function format_kyb_record($record)
{
    if (empty($record)) {
        return $record;
    }
    $record['other_certificates'] = parse_other_certificates($record['other_certificates'] ?? null);
    $record['full_address'] = format_kyb_address($record);
    $record['status_text'] = get_kyb_status_text($record['status'] ?? 0);
    return $record;
}

function check_upload_error($errorCode)
{
    $errors = [
        UPLOAD_ERR_INI_SIZE => '上传文件过大（超过php.ini限制）',
        UPLOAD_ERR_FORM_SIZE => '上传文件过大（超过表单限制）',
        UPLOAD_ERR_PARTIAL => '文件只有部分被上传',
        UPLOAD_ERR_NO_FILE => '没有文件被上传',
        UPLOAD_ERR_NO_TMP_DIR => '找不到临时文件夹',
        UPLOAD_ERR_CANT_WRITE => '文件写入失败',
        UPLOAD_ERR_EXTENSION => 'PHP扩展停止了文件上传',
    ];

    if ($errorCode !== UPLOAD_ERR_OK) {
        $message = $errors[$errorCode] ?? '未知上传错误';
        json_response(ERR_BAD_REQUEST, '上传失败：' . $message);
    }
}
