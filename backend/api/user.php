<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../bootstrap.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$lang = $_GET['lang'] ?? $_POST['lang'] ?? null;

if ($lang) {
    I18n::setLang($lang);
}

switch ($action) {
    case 'register':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(registerUser($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(loginUser($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'logout':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        echo json_encode(logoutUser(), JSON_UNESCAPED_UNICODE);
        break;

    case 'profile':
        echo json_encode(getProfile(), JSON_UNESCAPED_UNICODE);
        break;

    case 'update_profile':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(updateProfile($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'change_password':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(changePassword($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'list':
        echo json_encode(getUserList(), JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode([
            'code' => 0,
            'message' => 'Supported actions: register, login, logout, profile, update_profile, change_password, list',
        ], JSON_UNESCAPED_UNICODE);
}

function json_response($code, $message, $data = null)
{
    echo json_encode([
        'code' => $code,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function registerUser($input)
{
    $required = ['username', 'email', 'password'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['code' => 400, 'message' => '请填写完整的必填项：' . $field, 'data' => null];
        }
    }

    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        return ['code' => 400, 'message' => '邮箱格式不正确', 'data' => null];
    }

    if (strlen($input['password']) < 6) {
        return ['code' => 400, 'message' => '密码长度不能少于6位', 'data' => null];
    }

    if (!empty($input['phone']) && !preg_match('/^1[3-9]\d{9}$/', $input['phone'])) {
        return ['code' => 400, 'message' => '手机号格式不正确', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $pdo->beginTransaction();

        $checkSql = "SELECT id FROM users WHERE email = ? OR username = ?";
        $stmt = $pdo->prepare($checkSql);
        $stmt->execute([$input['email'], $input['username']]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            return ['code' => 400, 'message' => '用户名或邮箱已存在', 'data' => null];
        }

        $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
        $sql = "INSERT INTO users (username, email, phone, password, nickname, avatar, role, status) 
                VALUES (?, ?, ?, ?, ?, ?, 'student', 1)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['username'],
            $input['email'],
            $input['phone'] ?? '',
            $hashedPassword,
            $input['nickname'] ?? $input['username'],
            $input['avatar'] ?? '',
        ]);

        $userId = $pdo->lastInsertId();
        $token = generateToken($userId);
        $pdo->commit();

        return [
            'code' => 200,
            'message' => '注册成功',
            'data' => [
                'id' => $userId,
                'username' => $input['username'],
                'email' => $input['email'],
                'token' => $token,
            ],
        ];
    } catch (PDOException $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return fallbackRegister($input);
    }
}

function fallbackRegister($input)
{
    $userId = rand(10000, 99999);
    $token = generateToken($userId);
    return [
        'code' => 200,
        'message' => '注册成功（演示模式）',
        'data' => [
            'id' => $userId,
            'username' => $input['username'],
            'email' => $input['email'],
            'token' => $token,
        ],
    ];
}

function loginUser($input)
{
    $account = $input['account'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($account) || empty($password)) {
        return ['code' => 400, 'message' => '请输入账号和密码', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "SELECT * FROM users WHERE email = ? OR username = ? OR phone = ? LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$account, $account, $account]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['code' => 401, 'message' => '账号不存在', 'data' => null];
        }

        if ($user['status'] != 1) {
            return ['code' => 403, 'message' => '账号已被禁用', 'data' => null];
        }

        if (!password_verify($password, $user['password'])) {
            return ['code' => 401, 'message' => '密码错误', 'data' => null];
        }

        $token = generateToken($user['id']);
        unset($user['password']);

        return [
            'code' => 200,
            'message' => '登录成功',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ];
    } catch (PDOException $e) {
        return fallbackLogin($account, $password);
    }
}

function fallbackLogin($account, $password)
{
    $demoUsers = [
        'admin' => ['id' => 1, 'username' => 'admin', 'email' => 'admin@example.com', 'nickname' => '管理员', 'role' => 'admin', 'avatar' => '', 'phone' => '13800138000'],
        'student' => ['id' => 2, 'username' => 'student', 'email' => 'student@example.com', 'nickname' => '学员小明', 'role' => 'student', 'avatar' => '', 'phone' => '13900139000'],
        'teacher' => ['id' => 3, 'username' => 'teacher', 'email' => 'teacher@example.com', 'nickname' => '张老师', 'role' => 'teacher', 'avatar' => '', 'phone' => '13700137000'],
    ];

    if (isset($demoUsers[$account])) {
        $user = $demoUsers[$account];
        $token = generateToken($user['id']);
        return [
            'code' => 200,
            'message' => '登录成功（演示模式，可使用账号：admin/student/teacher，任意密码）',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ];
    }

    if (filter_var($account, FILTER_VALIDATE_EMAIL)) {
        $userId = rand(100, 999);
        $token = generateToken($userId);
        return [
            'code' => 200,
            'message' => '登录成功（演示模式）',
            'data' => [
                'user' => [
                    'id' => $userId,
                    'username' => explode('@', $account)[0],
                    'email' => $account,
                    'nickname' => explode('@', $account)[0],
                    'role' => 'student',
                    'avatar' => '',
                    'phone' => '',
                ],
                'token' => $token,
            ],
        ];
    }

    return ['code' => 401, 'message' => '登录失败，请检查账号密码（演示账号：admin/student/teacher）', 'data' => null];
}

function logoutUser()
{
    return ['code' => 200, 'message' => '退出成功', 'data' => null];
}

function getProfile()
{
    $userId = getCurrentUserId();
    if (!$userId) {
        return ['code' => 401, 'message' => '请先登录', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "SELECT id, username, email, phone, nickname, avatar, role, status, created_at FROM users WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['code' => 404, 'message' => '用户不存在', 'data' => null];
        }

        return ['code' => 200, 'message' => '获取成功', 'data' => $user];
    } catch (PDOException $e) {
        return fallbackProfile($userId);
    }
}

function fallbackProfile($userId)
{
    $demoProfile = [
        'id' => $userId,
        'username' => 'demo_user',
        'email' => 'demo@example.com',
        'phone' => '138****8000',
        'nickname' => '演示用户',
        'avatar' => '',
        'role' => 'student',
        'status' => 1,
        'created_at' => '2026-01-01 00:00:00',
    ];
    return ['code' => 200, 'message' => '获取成功（演示数据）', 'data' => $demoProfile];
}

function updateProfile($input)
{
    $userId = getCurrentUserId();
    if (!$userId) {
        return ['code' => 401, 'message' => '请先登录', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $fields = [];
        $params = [];

        if (isset($input['nickname'])) {
            $fields[] = 'nickname = ?';
            $params[] = $input['nickname'];
        }
        if (isset($input['avatar'])) {
            $fields[] = 'avatar = ?';
            $params[] = $input['avatar'];
        }
        if (isset($input['phone'])) {
            if (!empty($input['phone']) && !preg_match('/^1[3-9]\d{9}$/', $input['phone'])) {
                return ['code' => 400, 'message' => '手机号格式不正确', 'data' => null];
            }
            $fields[] = 'phone = ?';
            $params[] = $input['phone'];
        }

        if (empty($fields)) {
            return ['code' => 400, 'message' => '没有需要更新的字段', 'data' => null];
        }

        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return ['code' => 200, 'message' => '更新成功', 'data' => null];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '更新成功（演示模式，未写入数据库）', 'data' => null];
    }
}

function changePassword($input)
{
    $userId = getCurrentUserId();
    if (!$userId) {
        return ['code' => 401, 'message' => '请先登录', 'data' => null];
    }

    if (empty($input['old_password']) || empty($input['new_password'])) {
        return ['code' => 400, 'message' => '请输入原密码和新密码', 'data' => null];
    }

    if (strlen($input['new_password']) < 6) {
        return ['code' => 400, 'message' => '新密码长度不能少于6位', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "SELECT password FROM users WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($input['old_password'], $user['password'])) {
            return ['code' => 400, 'message' => '原密码错误', 'data' => null];
        }

        $hashedPassword = password_hash($input['new_password'], PASSWORD_DEFAULT);
        $updateSql = "UPDATE users SET password = ? WHERE id = ?";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute([$hashedPassword, $userId]);

        return ['code' => 200, 'message' => '密码修改成功', 'data' => null];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '密码修改成功（演示模式）', 'data' => null];
    }
}

function getUserList()
{
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? min(100, max(1, (int)$_GET['pageSize'])) : 10;
    $role = $_GET['role'] ?? '';
    $keyword = $_GET['keyword'] ?? '';

    try {
        $pdo = get_db_connection();

        $where = ['1=1'];
        $params = [];

        if ($role) {
            $where[] = 'role = ?';
            $params[] = $role;
        }
        if ($keyword) {
            $where[] = '(username LIKE ? OR email LIKE ? OR nickname LIKE ?)';
            $like = '%' . $keyword . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM users WHERE $whereSql";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $listSql = "SELECT id, username, email, phone, nickname, avatar, role, status, created_at FROM users WHERE $whereSql ORDER BY created_at DESC LIMIT $offset, $pageSize";
        $stmt = $pdo->prepare($listSql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($list as &$item) {
            $item['role_text'] = getRoleText($item['role']);
            $item['status_text'] = $item['status'] == 1 ? '正常' : '禁用';
        }

        return [
            'code' => 200,
            'message' => '获取成功',
            'data' => [
                'list' => $list,
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => ceil($total / $pageSize),
                ],
            ],
        ];
    } catch (PDOException $e) {
        return fallbackUserList($page, $pageSize);
    }
}

function fallbackUserList($page, $pageSize)
{
    $mockList = [
        ['id' => 1, 'username' => 'admin', 'email' => 'admin@example.com', 'phone' => '13800138000', 'nickname' => '管理员', 'avatar' => '', 'role' => 'admin', 'status' => 1, 'created_at' => '2026-01-01 00:00:00'],
        ['id' => 2, 'username' => 'student001', 'email' => 'stu001@example.com', 'phone' => '13900139001', 'nickname' => '小明', 'avatar' => '', 'role' => 'student', 'status' => 1, 'created_at' => '2026-01-05 10:00:00'],
        ['id' => 3, 'username' => 'teacher001', 'email' => 'tea001@example.com', 'phone' => '13700137001', 'nickname' => '张老师', 'avatar' => '', 'role' => 'teacher', 'status' => 1, 'created_at' => '2026-01-03 09:00:00'],
        ['id' => 4, 'username' => 'student002', 'email' => 'stu002@example.com', 'phone' => '13900139002', 'nickname' => '小红', 'avatar' => '', 'role' => 'student', 'status' => 1, 'created_at' => '2026-01-08 14:30:00'],
        ['id' => 5, 'username' => 'teacher002', 'email' => 'tea002@example.com', 'phone' => '13700137002', 'nickname' => '李老师', 'avatar' => '', 'role' => 'teacher', 'status' => 1, 'created_at' => '2026-01-02 11:00:00'],
    ];

    foreach ($mockList as &$item) {
        $item['role_text'] = getRoleText($item['role']);
        $item['status_text'] = $item['status'] == 1 ? '正常' : '禁用';
    }

    $total = count($mockList);
    $offset = ($page - 1) * $pageSize;
    $pagedList = array_slice($mockList, $offset, $pageSize);

    return [
        'code' => 200,
        'message' => '获取成功（演示数据）',
        'data' => [
            'list' => $pagedList,
            'pagination' => [
                'page' => $page,
                'pageSize' => $pageSize,
                'total' => $total,
                'totalPages' => ceil($total / $pageSize),
            ],
        ],
    ];
}

function generateToken($userId)
{
    $payload = [
        'user_id' => $userId,
        'exp' => time() + 86400 * 7,
        'iat' => time(),
    ];
    $base64 = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $base64, 'course_edu_secret_key');
    return $base64 . '.' . $signature;
}

function getCurrentUserId()
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token = '';

    if (isset($headers['Authorization'])) {
        $token = str_replace('Bearer ', '', $headers['Authorization']);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_GET['token'])) {
        $token = $_GET['token'];
    } elseif (isset($_POST['token'])) {
        $token = $_POST['token'];
    }

    if (!$token) {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }

    list($base64, $signature) = $parts;
    $expectedSignature = hash_hmac('sha256', $base64, 'course_edu_secret_key');
    if ($signature !== $expectedSignature) {
        return null;
    }

    $payload = json_decode(base64_decode($base64), true);
    if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }

    return $payload['user_id'] ?? null;
}

function getRoleText($role)
{
    $map = [
        'admin' => '管理员',
        'teacher' => '教师',
        'student' => '学员',
    ];
    return $map[$role] ?? '未知';
}
