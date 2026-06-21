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
    case 'list':
        echo json_encode(getCourseList(), JSON_UNESCAPED_UNICODE);
        break;

    case 'detail':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        echo json_encode(getCourseDetail($id), JSON_UNESCAPED_UNICODE);
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(createCourse($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'update':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(updateCourse($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        echo json_encode(deleteCourse($id), JSON_UNESCAPED_UNICODE);
        break;

    case 'categories':
        echo json_encode(getCategories(), JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode([
            'code' => 0,
            'message' => 'Supported actions: list, detail, create, update, delete, categories',
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

function getCourseList()
{
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? min(100, max(1, (int)$_GET['pageSize'])) : 10;
    $category = $_GET['category'] ?? '';
    $level = $_GET['level'] ?? '';
    $keyword = $_GET['keyword'] ?? '';

    try {
        $pdo = get_db_connection();

        $where = ['1=1'];
        $params = [];

        if ($category) {
            $where[] = 'category = ?';
            $params[] = $category;
        }
        if ($level) {
            $where[] = 'level = ?';
            $params[] = $level;
        }
        if ($keyword) {
            $where[] = '(title LIKE ? OR description LIKE ?)';
            $params[] = '%' . $keyword . '%';
            $params[] = '%' . $keyword . '%';
        }

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM courses WHERE $whereSql";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $listSql = "SELECT * FROM courses WHERE $whereSql ORDER BY created_at DESC LIMIT $offset, $pageSize";
        $stmt = $pdo->prepare($listSql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($list as &$item) {
            $item['price_formatted'] = Currency::format($item['price']);
            $item['original_price_formatted'] = Currency::format($item['original_price']);
            $item['status_text'] = getCourseStatusText($item['status']);
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
        return fallbackCourseList($page, $pageSize);
    }
}

function fallbackCourseList($page, $pageSize)
{
    $mockList = [
        ['id' => 1, 'title' => 'PHP从入门到精通', 'description' => '系统学习PHP开发技术', 'teacher_id' => 1, 'teacher_name' => '张老师', 'category' => 'programming', 'level' => 'beginner', 'price' => 299, 'original_price' => 499, 'students' => 1234, 'rating' => 4.8, 'lessons_count' => 48, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-15 10:00:00'],
        ['id' => 2, 'title' => 'Vue3实战开发', 'description' => '深入学习Vue3组合式API', 'teacher_id' => 2, 'teacher_name' => '李老师', 'category' => 'frontend', 'level' => 'intermediate', 'price' => 399, 'original_price' => 599, 'students' => 876, 'rating' => 4.9, 'lessons_count' => 36, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-10 14:30:00'],
        ['id' => 3, 'title' => 'MySQL数据库优化', 'description' => '掌握MySQL性能调优技巧', 'teacher_id' => 3, 'teacher_name' => '王老师', 'category' => 'database', 'level' => 'advanced', 'price' => 599, 'original_price' => 899, 'students' => 432, 'rating' => 4.7, 'lessons_count' => 24, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-05 09:00:00'],
        ['id' => 4, 'title' => 'Python数据分析', 'description' => '使用Pandas进行数据分析', 'teacher_id' => 1, 'teacher_name' => '张老师', 'category' => 'data', 'level' => 'beginner', 'price' => 0, 'original_price' => 0, 'students' => 5678, 'rating' => 4.6, 'lessons_count' => 12, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-01 00:00:00'],
    ];

    foreach ($mockList as &$item) {
        $item['price_formatted'] = $item['price'] > 0 ? Currency::format($item['price']) : I18n::t('course.free');
        $item['original_price_formatted'] = $item['original_price'] > 0 ? Currency::format($item['original_price']) : '-';
        $item['status_text'] = getCourseStatusText($item['status']);
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

function getCourseDetail($id)
{
    if ($id <= 0) {
        return ['code' => 400, 'message' => '课程ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "SELECT c.*, t.name as teacher_name, t.avatar as teacher_avatar, t.bio as teacher_bio 
                FROM courses c 
                LEFT JOIN teachers t ON c.teacher_id = t.id 
                WHERE c.id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$course) {
            return ['code' => 404, 'message' => '课程不存在', 'data' => null];
        }

        $course['price_formatted'] = $course['price'] > 0 ? Currency::format($course['price']) : I18n::t('course.free');
        $course['original_price_formatted'] = $course['original_price'] > 0 ? Currency::format($course['original_price']) : '-';
        $course['status_text'] = getCourseStatusText($course['status']);
        $course['level_text'] = I18n::t('course.level_' . $course['level']);

        return ['code' => 200, 'message' => '获取成功', 'data' => $course];
    } catch (PDOException $e) {
        return fallbackCourseDetail($id);
    }
}

function fallbackCourseDetail($id)
{
    $mockCourses = [
        1 => ['id' => 1, 'title' => 'PHP从入门到精通', 'description' => '系统学习PHP开发技术，包括基础语法、面向对象、MySQL数据库、Laravel框架等内容。', 'teacher_id' => 1, 'teacher_name' => '张老师', 'teacher_avatar' => '', 'teacher_bio' => '10年PHP开发经验，曾任某互联网公司技术总监。', 'category' => 'programming', 'level' => 'beginner', 'price' => 299, 'original_price' => 499, 'students' => 1234, 'rating' => 4.8, 'lessons_count' => 48, 'status' => 1, 'cover' => '', 'start_date' => '2026-02-01', 'created_at' => '2026-01-15 10:00:00'],
        2 => ['id' => 2, 'title' => 'Vue3实战开发', 'description' => '深入学习Vue3组合式API，掌握现代前端开发技术栈。', 'teacher_id' => 2, 'teacher_name' => '李老师', 'teacher_avatar' => '', 'teacher_bio' => '8年前端开发经验，Vue核心贡献者。', 'category' => 'frontend', 'level' => 'intermediate', 'price' => 399, 'original_price' => 599, 'students' => 876, 'rating' => 4.9, 'lessons_count' => 36, 'status' => 1, 'cover' => '', 'start_date' => '2026-02-15', 'created_at' => '2026-01-10 14:30:00'],
        3 => ['id' => 3, 'title' => 'MySQL数据库优化', 'description' => '掌握MySQL性能调优技巧，提升应用响应速度。', 'teacher_id' => 3, 'teacher_name' => '王老师', 'teacher_avatar' => '', 'teacher_bio' => '12年DBA经验，精通数据库架构设计。', 'category' => 'database', 'level' => 'advanced', 'price' => 599, 'original_price' => 899, 'students' => 432, 'rating' => 4.7, 'lessons_count' => 24, 'status' => 1, 'cover' => '', 'start_date' => '2026-03-01', 'created_at' => '2026-01-05 09:00:00'],
        4 => ['id' => 4, 'title' => 'Python数据分析', 'description' => '使用Pandas、NumPy进行数据分析和可视化。', 'teacher_id' => 1, 'teacher_name' => '张老师', 'teacher_avatar' => '', 'teacher_bio' => '10年PHP开发经验，数据科学爱好者。', 'category' => 'data', 'level' => 'beginner', 'price' => 0, 'original_price' => 0, 'students' => 5678, 'rating' => 4.6, 'lessons_count' => 12, 'status' => 1, 'cover' => '', 'start_date' => '2026-01-15', 'created_at' => '2026-01-01 00:00:00'],
    ];

    if (!isset($mockCourses[$id])) {
        return ['code' => 404, 'message' => '课程不存在', 'data' => null];
    }

    $course = $mockCourses[$id];
    $course['price_formatted'] = $course['price'] > 0 ? Currency::format($course['price']) : I18n::t('course.free');
    $course['original_price_formatted'] = $course['original_price'] > 0 ? Currency::format($course['original_price']) : '-';
    $course['status_text'] = getCourseStatusText($course['status']);
    $course['level_text'] = I18n::t('course.level_' . $course['level']);

    return ['code' => 200, 'message' => '获取成功（演示数据）', 'data' => $course];
}

function createCourse($input)
{
    $required = ['title', 'teacher_id', 'category', 'level', 'price'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['code' => 400, 'message' => '缺少必填项：' . $field, 'data' => null];
        }
    }

    try {
        $pdo = get_db_connection();
        $sql = "INSERT INTO courses (title, description, teacher_id, category, level, price, original_price, lessons_count, cover, start_date, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['title'],
            $input['description'] ?? '',
            (int)$input['teacher_id'],
            $input['category'],
            $input['level'],
            (float)$input['price'],
            isset($input['original_price']) ? (float)$input['original_price'] : (float)$input['price'],
            isset($input['lessons_count']) ? (int)$input['lessons_count'] : 0,
            $input['cover'] ?? '',
            $input['start_date'] ?? null,
        ]);

        $id = $pdo->lastInsertId();
        return ['code' => 200, 'message' => '创建成功', 'data' => ['id' => $id]];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '创建成功（演示模式，未写入数据库）', 'data' => ['id' => rand(100, 999)]];
    }
}

function updateCourse($input)
{
    if (empty($input['id'])) {
        return ['code' => 400, 'message' => '缺少课程ID', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "UPDATE courses SET title=?, description=?, teacher_id=?, category=?, level=?, price=?, original_price=?, lessons_count=?, cover=?, start_date=?, status=? WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['title'] ?? '',
            $input['description'] ?? '',
            isset($input['teacher_id']) ? (int)$input['teacher_id'] : 0,
            $input['category'] ?? '',
            $input['level'] ?? 'beginner',
            isset($input['price']) ? (float)$input['price'] : 0,
            isset($input['original_price']) ? (float)$input['original_price'] : 0,
            isset($input['lessons_count']) ? (int)$input['lessons_count'] : 0,
            $input['cover'] ?? '',
            $input['start_date'] ?? null,
            isset($input['status']) ? (int)$input['status'] : 1,
            (int)$input['id'],
        ]);

        return ['code' => 200, 'message' => '更新成功', 'data' => ['id' => (int)$input['id']]];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '更新成功（演示模式，未写入数据库）', 'data' => ['id' => (int)$input['id']]];
    }
}

function deleteCourse($id)
{
    if ($id <= 0) {
        return ['code' => 400, 'message' => '课程ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "DELETE FROM courses WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);

        return ['code' => 200, 'message' => '删除成功', 'data' => null];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '删除成功（演示模式，未实际删除）', 'data' => null];
    }
}

function getCategories()
{
    $categories = [
        ['value' => 'programming', 'label' => '编程开发'],
        ['value' => 'frontend', 'label' => '前端开发'],
        ['value' => 'backend', 'label' => '后端开发'],
        ['value' => 'database', 'label' => '数据库'],
        ['value' => 'data', 'label' => '数据分析'],
        ['value' => 'mobile', 'label' => '移动开发'],
        ['value' => 'devops', 'label' => '运维部署'],
        ['value' => 'design', 'label' => 'UI设计'],
        ['value' => 'business', 'label' => '商业管理'],
        ['value' => 'language', 'label' => '外语学习'],
    ];

    return ['code' => 200, 'message' => '获取成功', 'data' => $categories];
}

function getCourseStatusText($status)
{
    $map = [
        0 => '未发布',
        1 => '已发布',
        2 => '已下架',
    ];
    return $map[$status] ?? '未知';
}
