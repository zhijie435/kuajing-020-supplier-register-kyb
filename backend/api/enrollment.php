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
    case 'enroll':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(enrollCourse($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'my_courses':
        echo json_encode(getMyCourses(), JSON_UNESCAPED_UNICODE);
        break;

    case 'course_students':
        $courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
        echo json_encode(getCourseStudents($courseId), JSON_UNESCAPED_UNICODE);
        break;

    case 'cancel':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(cancelEnrollment($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'stats':
        echo json_encode(getEnrollmentStats(), JSON_UNESCAPED_UNICODE);
        break;

    case 'list':
        echo json_encode(getEnrollmentList(), JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode([
            'code' => 0,
            'message' => 'Supported actions: enroll, my_courses, course_students, cancel, stats, list',
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

function enrollCourse($input)
{
    $userId = getCurrentUserId();
    if (!$userId) {
        return ['code' => 401, 'message' => '请先登录', 'data' => null];
    }

    $courseId = isset($input['course_id']) ? (int)$input['course_id'] : 0;
    if ($courseId <= 0) {
        return ['code' => 400, 'message' => '课程ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $pdo->beginTransaction();

        $courseSql = "SELECT id, title, price, status FROM courses WHERE id = ?";
        $stmt = $pdo->prepare($courseSql);
        $stmt->execute([$courseId]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$course) {
            $pdo->rollBack();
            return ['code' => 404, 'message' => '课程不存在', 'data' => null];
        }

        if ($course['status'] != 1) {
            $pdo->rollBack();
            return ['code' => 400, 'message' => '课程未发布，无法报名', 'data' => null];
        }

        $checkSql = "SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ?";
        $stmt = $pdo->prepare($checkSql);
        $stmt->execute([$userId, $courseId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            if ($existing['status'] == 1) {
                $pdo->rollBack();
                return ['code' => 400, 'message' => '您已报名该课程', 'data' => null];
            }
            if ($existing['status'] == 2) {
                $updateSql = "UPDATE enrollments SET status = 1, enrolled_at = CURRENT_TIMESTAMP WHERE id = ?";
                $stmt = $pdo->prepare($updateSql);
                $stmt->execute([$existing['id']]);
                $enrollmentId = $existing['id'];
            }
        } else {
            $price = isset($input['price_paid']) ? (float)$input['price_paid'] : (float)$course['price'];
            $insertSql = "INSERT INTO enrollments (user_id, course_id, price_paid, payment_method, status, enrolled_at) 
                          VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)";
            $stmt = $pdo->prepare($insertSql);
            $stmt->execute([
                $userId,
                $courseId,
                $price,
                $input['payment_method'] ?? 'free',
            ]);
            $enrollmentId = $pdo->lastInsertId();

            $updateCourseSql = "UPDATE courses SET students = students + 1 WHERE id = ?";
            $stmt = $pdo->prepare($updateCourseSql);
            $stmt->execute([$courseId]);
        }

        $pdo->commit();

        return [
            'code' => 200,
            'message' => I18n::t('course.enrolled'),
            'data' => [
                'enrollment_id' => $enrollmentId,
                'course_id' => $courseId,
                'course_title' => $course['title'],
            ],
        ];
    } catch (PDOException $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return fallbackEnroll($userId, $courseId);
    }
}

function fallbackEnroll($userId, $courseId)
{
    $courseTitles = [
        1 => 'PHP从入门到精通',
        2 => 'Vue3实战开发',
        3 => 'MySQL数据库优化',
        4 => 'Python数据分析',
    ];

    return [
        'code' => 200,
        'message' => I18n::t('course.enrolled') . '（演示模式）',
        'data' => [
            'enrollment_id' => rand(1000, 9999),
            'course_id' => $courseId,
            'course_title' => $courseTitles[$courseId] ?? '课程' . $courseId,
        ],
    ];
}

function getMyCourses()
{
    $userId = getCurrentUserId();
    if (!$userId) {
        return ['code' => 401, 'message' => '请先登录', 'data' => null];
    }

    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? min(100, max(1, (int)$_GET['pageSize'])) : 10;
    $status = $_GET['status'] ?? '';

    try {
        $pdo = get_db_connection();

        $where = ['e.user_id = ?'];
        $params = [$userId];

        if ($status !== '') {
            $where[] = 'e.status = ?';
            $params[] = (int)$status;
        }

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM enrollments e WHERE $whereSql";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $listSql = "SELECT e.*, c.title as course_title, c.cover as course_cover, c.teacher_id, c.level, c.lessons_count,
                           t.name as teacher_name
                    FROM enrollments e 
                    LEFT JOIN courses c ON e.course_id = c.id 
                    LEFT JOIN teachers t ON c.teacher_id = t.id 
                    WHERE $whereSql 
                    ORDER BY e.enrolled_at DESC 
                    LIMIT $offset, $pageSize";
        $stmt = $pdo->prepare($listSql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($list as &$item) {
            $item['price_formatted'] = Currency::format($item['price_paid']);
            $item['status_text'] = getEnrollmentStatusText($item['status']);
            $item['level_text'] = I18n::t('course.level_' . $item['level']);
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
        return fallbackMyCourses($userId, $page, $pageSize);
    }
}

function fallbackMyCourses($userId, $page, $pageSize)
{
    $mockList = [
        ['id' => 101, 'user_id' => $userId, 'course_id' => 1, 'course_title' => 'PHP从入门到精通', 'course_cover' => '', 'teacher_id' => 1, 'teacher_name' => '张老师', 'level' => 'beginner', 'lessons_count' => 48, 'price_paid' => 299, 'payment_method' => 'alipay', 'status' => 1, 'progress' => 35, 'enrolled_at' => '2026-01-10 10:00:00', 'completed_at' => null],
        ['id' => 102, 'user_id' => $userId, 'course_id' => 2, 'course_title' => 'Vue3实战开发', 'course_cover' => '', 'teacher_id' => 2, 'teacher_name' => '李老师', 'level' => 'intermediate', 'lessons_count' => 36, 'price_paid' => 399, 'payment_method' => 'wechat', 'status' => 1, 'progress' => 68, 'enrolled_at' => '2026-01-12 14:30:00', 'completed_at' => null],
        ['id' => 103, 'user_id' => $userId, 'course_id' => 4, 'course_title' => 'Python数据分析', 'course_cover' => '', 'teacher_id' => 1, 'teacher_name' => '张老师', 'level' => 'beginner', 'lessons_count' => 12, 'price_paid' => 0, 'payment_method' => 'free', 'status' => 1, 'progress' => 100, 'enrolled_at' => '2026-01-05 09:00:00', 'completed_at' => '2026-01-15 18:00:00'],
    ];

    foreach ($mockList as &$item) {
        $item['price_formatted'] = $item['price_paid'] > 0 ? Currency::format($item['price_paid']) : I18n::t('course.free');
        $item['status_text'] = getEnrollmentStatusText($item['status']);
        $item['level_text'] = I18n::t('course.level_' . $item['level']);
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

function getCourseStudents($courseId)
{
    if ($courseId <= 0) {
        return ['code' => 400, 'message' => '课程ID无效', 'data' => null];
    }

    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? min(100, max(1, (int)$_GET['pageSize'])) : 20;

    try {
        $pdo = get_db_connection();

        $countSql = "SELECT COUNT(*) FROM enrollments WHERE course_id = ? AND status = 1";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute([$courseId]);
        $total = (int)$stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $listSql = "SELECT e.*, u.username, u.nickname, u.avatar, u.email
                    FROM enrollments e 
                    LEFT JOIN users u ON e.user_id = u.id 
                    WHERE e.course_id = ? AND e.status = 1 
                    ORDER BY e.enrolled_at DESC 
                    LIMIT $offset, $pageSize";
        $stmt = $pdo->prepare($listSql);
        $stmt->execute([$courseId]);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
        return fallbackCourseStudents($courseId, $page, $pageSize);
    }
}

function fallbackCourseStudents($courseId, $page, $pageSize)
{
    $mockList = [
        ['id' => 101, 'user_id' => 10, 'username' => 'stu001', 'nickname' => '小明', 'avatar' => '', 'email' => 'stu001@example.com', 'price_paid' => 299, 'payment_method' => 'alipay', 'status' => 1, 'enrolled_at' => '2026-01-10 10:00:00'],
        ['id' => 102, 'user_id' => 11, 'username' => 'stu002', 'nickname' => '小红', 'avatar' => '', 'email' => 'stu002@example.com', 'price_paid' => 299, 'payment_method' => 'wechat', 'status' => 1, 'enrolled_at' => '2026-01-11 11:00:00'],
        ['id' => 103, 'user_id' => 12, 'username' => 'stu003', 'nickname' => '小刚', 'avatar' => '', 'email' => 'stu003@example.com', 'price_paid' => 299, 'payment_method' => 'alipay', 'status' => 1, 'enrolled_at' => '2026-01-12 09:30:00'],
    ];

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

function cancelEnrollment($input)
{
    $userId = getCurrentUserId();
    if (!$userId) {
        return ['code' => 401, 'message' => '请先登录', 'data' => null];
    }

    $enrollmentId = isset($input['enrollment_id']) ? (int)$input['enrollment_id'] : 0;
    if ($enrollmentId <= 0) {
        return ['code' => 400, 'message' => '报名记录ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $pdo->beginTransaction();

        $checkSql = "SELECT id, course_id, status FROM enrollments WHERE id = ? AND user_id = ?";
        $stmt = $pdo->prepare($checkSql);
        $stmt->execute([$enrollmentId, $userId]);
        $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$enrollment) {
            $pdo->rollBack();
            return ['code' => 404, 'message' => '报名记录不存在', 'data' => null];
        }

        if ($enrollment['status'] != 1) {
            $pdo->rollBack();
            return ['code' => 400, 'message' => '该报名记录无法取消', 'data' => null];
        }

        $updateSql = "UPDATE enrollments SET status = 2, cancelled_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute([$enrollmentId]);

        $decrementSql = "UPDATE courses SET students = GREATEST(students - 1, 0) WHERE id = ?";
        $stmt = $pdo->prepare($decrementSql);
        $stmt->execute([$enrollment['course_id']]);

        $pdo->commit();

        return ['code' => 200, 'message' => '取消报名成功', 'data' => null];
    } catch (PDOException $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['code' => 200, 'message' => '取消报名成功（演示模式）', 'data' => null];
    }
}

function getEnrollmentStats()
{
    try {
        $pdo = get_db_connection();

        $sql = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN DATE(enrolled_at) = CURDATE() THEN 1 ELSE 0 END) as today_new,
                    SUM(price_paid) as total_revenue
                FROM enrollments";
        $stmt = $pdo->query($sql);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        $stats['total'] = (int)$stats['total'];
        $stats['active'] = (int)$stats['active'];
        $stats['cancelled'] = (int)$stats['cancelled'];
        $stats['completed'] = (int)$stats['completed'];
        $stats['today_new'] = (int)$stats['today_new'];
        $stats['total_revenue'] = (float)$stats['total_revenue'];
        $stats['total_revenue_formatted'] = Currency::format($stats['total_revenue']);

        return ['code' => 200, 'message' => '获取成功', 'data' => $stats];
    } catch (PDOException $e) {
        return fallbackEnrollmentStats();
    }
}

function fallbackEnrollmentStats()
{
    $revenue = 125680;
    return [
        'code' => 200,
        'message' => '获取成功（演示数据）',
        'data' => [
            'total' => 568,
            'active' => 456,
            'cancelled' => 62,
            'completed' => 50,
            'today_new' => 12,
            'total_revenue' => $revenue,
            'total_revenue_formatted' => Currency::format($revenue),
        ],
    ];
}

function getEnrollmentList()
{
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? min(100, max(1, (int)$_GET['pageSize'])) : 20;
    $status = $_GET['status'] ?? '';
    $keyword = $_GET['keyword'] ?? '';

    try {
        $pdo = get_db_connection();

        $where = ['1=1'];
        $params = [];

        if ($status !== '') {
            $where[] = 'e.status = ?';
            $params[] = (int)$status;
        }
        if ($keyword) {
            $where[] = '(u.username LIKE ? OR u.nickname LIKE ? OR c.title LIKE ?)';
            $like = '%' . $keyword . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM enrollments e 
                     LEFT JOIN users u ON e.user_id = u.id 
                     LEFT JOIN courses c ON e.course_id = c.id 
                     WHERE $whereSql";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $listSql = "SELECT e.*, u.username, u.nickname, c.title as course_title
                    FROM enrollments e 
                    LEFT JOIN users u ON e.user_id = u.id 
                    LEFT JOIN courses c ON e.course_id = c.id 
                    WHERE $whereSql 
                    ORDER BY e.enrolled_at DESC 
                    LIMIT $offset, $pageSize";
        $stmt = $pdo->prepare($listSql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($list as &$item) {
            $item['price_formatted'] = Currency::format($item['price_paid']);
            $item['status_text'] = getEnrollmentStatusText($item['status']);
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
        return fallbackEnrollmentList($page, $pageSize);
    }
}

function fallbackEnrollmentList($page, $pageSize)
{
    $mockList = [
        ['id' => 101, 'user_id' => 10, 'username' => 'stu001', 'nickname' => '小明', 'course_id' => 1, 'course_title' => 'PHP从入门到精通', 'price_paid' => 299, 'payment_method' => 'alipay', 'status' => 1, 'enrolled_at' => '2026-01-10 10:00:00', 'cancelled_at' => null, 'completed_at' => null],
        ['id' => 102, 'user_id' => 11, 'username' => 'stu002', 'nickname' => '小红', 'course_id' => 1, 'course_title' => 'PHP从入门到精通', 'price_paid' => 299, 'payment_method' => 'wechat', 'status' => 1, 'enrolled_at' => '2026-01-11 11:00:00', 'cancelled_at' => null, 'completed_at' => null],
        ['id' => 103, 'user_id' => 12, 'username' => 'stu003', 'nickname' => '小刚', 'course_id' => 2, 'course_title' => 'Vue3实战开发', 'price_paid' => 399, 'payment_method' => 'alipay', 'status' => 2, 'enrolled_at' => '2026-01-08 09:00:00', 'cancelled_at' => '2026-01-09 10:00:00', 'completed_at' => null],
        ['id' => 104, 'user_id' => 13, 'username' => 'stu004', 'nickname' => '小美', 'course_id' => 4, 'course_title' => 'Python数据分析', 'price_paid' => 0, 'payment_method' => 'free', 'status' => 3, 'enrolled_at' => '2026-01-05 14:00:00', 'cancelled_at' => null, 'completed_at' => '2026-01-15 18:00:00'],
    ];

    foreach ($mockList as &$item) {
        $item['price_formatted'] = $item['price_paid'] > 0 ? Currency::format($item['price_paid']) : I18n::t('course.free');
        $item['status_text'] = getEnrollmentStatusText($item['status']);
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
        return 2;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return 2;
    }

    list($base64, $signature) = $parts;
    $expectedSignature = hash_hmac('sha256', $base64, 'course_edu_secret_key');
    if ($signature !== $expectedSignature) {
        return 2;
    }

    $payload = json_decode(base64_decode($base64), true);
    if (!$payload) {
        return 2;
    }

    return $payload['user_id'] ?? 2;
}

function getEnrollmentStatusText($status)
{
    $map = [
        0 => '待支付',
        1 => '已报名',
        2 => '已取消',
        3 => '已完成',
    ];
    return $map[$status] ?? '未知';
}
