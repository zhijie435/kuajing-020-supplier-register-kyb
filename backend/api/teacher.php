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
        echo json_encode(getTeacherList(), JSON_UNESCAPED_UNICODE);
        break;

    case 'detail':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        echo json_encode(getTeacherDetail($id), JSON_UNESCAPED_UNICODE);
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(createTeacher($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'update':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        echo json_encode(updateTeacher($input), JSON_UNESCAPED_UNICODE);
        break;

    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(405, '请求方法不允许');
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        echo json_encode(deleteTeacher($id), JSON_UNESCAPED_UNICODE);
        break;

    case 'courses':
        $teacherId = isset($_GET['teacher_id']) ? (int)$_GET['teacher_id'] : 0;
        echo json_encode(getTeacherCourses($teacherId), JSON_UNESCAPED_UNICODE);
        break;

    case 'stats':
        echo json_encode(getTeacherStats(), JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode([
            'code' => 0,
            'message' => 'Supported actions: list, detail, create, update, delete, courses, stats',
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

function getTeacherList()
{
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? min(100, max(1, (int)$_GET['pageSize'])) : 10;
    $keyword = $_GET['keyword'] ?? '';
    $status = $_GET['status'] ?? '';

    try {
        $pdo = get_db_connection();

        $where = ['1=1'];
        $params = [];

        if ($keyword) {
            $where[] = '(name LIKE ? OR title LIKE ? OR bio LIKE ?)';
            $like = '%' . $keyword . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        if ($status !== '') {
            $where[] = 'status = ?';
            $params[] = (int)$status;
        }

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) FROM teachers WHERE $whereSql";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $offset = ($page - 1) * $pageSize;
        $listSql = "SELECT t.*, 
                           (SELECT COUNT(*) FROM courses WHERE teacher_id = t.id AND status = 1) as courses_count,
                           (SELECT COALESCE(SUM(students), 0) FROM courses WHERE teacher_id = t.id AND status = 1) as total_students,
                           (SELECT AVG(rating) FROM courses WHERE teacher_id = t.id AND status = 1) as avg_rating
                    FROM teachers t 
                    WHERE $whereSql 
                    ORDER BY t.created_at DESC 
                    LIMIT $offset, $pageSize";
        $stmt = $pdo->prepare($listSql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($list as &$item) {
            $item['status_text'] = getTeacherStatusText($item['status']);
            $item['avg_rating'] = $item['avg_rating'] ? round((float)$item['avg_rating'], 1) : 0;
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
        return fallbackTeacherList($page, $pageSize);
    }
}

function fallbackTeacherList($page, $pageSize)
{
    $mockList = [
        ['id' => 1, 'name' => '张老师', 'title' => '高级讲师', 'avatar' => '', 'bio' => '10年PHP开发经验，曾任某互联网公司技术总监，精通Laravel、Yii等主流PHP框架。', 'email' => 'zhang@example.com', 'phone' => '13700137001', 'courses_count' => 5, 'total_students' => 8520, 'avg_rating' => 4.8, 'status' => 1, 'created_at' => '2025-06-01 10:00:00'],
        ['id' => 2, 'name' => '李老师', 'title' => '前端架构师', 'avatar' => '', 'bio' => '8年前端开发经验，Vue核心贡献者，精通Vue、React、TypeScript等现代前端技术栈。', 'email' => 'li@example.com', 'phone' => '13700137002', 'courses_count' => 3, 'total_students' => 5640, 'avg_rating' => 4.9, 'status' => 1, 'created_at' => '2025-07-15 09:00:00'],
        ['id' => 3, 'name' => '王老师', 'title' => '资深DBA', 'avatar' => '', 'bio' => '12年DBA经验，精通MySQL、PostgreSQL数据库架构设计与性能调优。', 'email' => 'wang@example.com', 'phone' => '13700137003', 'courses_count' => 2, 'total_students' => 2890, 'avg_rating' => 4.7, 'status' => 1, 'created_at' => '2025-08-20 14:00:00'],
        ['id' => 4, 'name' => '赵老师', 'title' => '全栈工程师', 'avatar' => '', 'bio' => '7年全栈开发经验，擅长Node.js、Python，对微服务架构有深入研究。', 'email' => 'zhao@example.com', 'phone' => '13700137004', 'courses_count' => 4, 'total_students' => 4210, 'avg_rating' => 4.6, 'status' => 1, 'created_at' => '2025-09-10 11:00:00'],
        ['id' => 5, 'name' => '陈老师', 'title' => '数据科学家', 'avatar' => '', 'bio' => '数据分析领域专家，曾就职于知名互联网公司数据部门，精通Pandas、NumPy、TensorFlow。', 'email' => 'chen@example.com', 'phone' => '13700137005', 'courses_count' => 3, 'total_students' => 6780, 'avg_rating' => 4.8, 'status' => 1, 'created_at' => '2025-10-05 08:30:00'],
    ];

    foreach ($mockList as &$item) {
        $item['status_text'] = getTeacherStatusText($item['status']);
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

function getTeacherDetail($id)
{
    if ($id <= 0) {
        return ['code' => 400, 'message' => '教师ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "SELECT t.*, 
                       (SELECT COUNT(*) FROM courses WHERE teacher_id = t.id AND status = 1) as courses_count,
                       (SELECT COALESCE(SUM(students), 0) FROM courses WHERE teacher_id = t.id AND status = 1) as total_students,
                       (SELECT AVG(rating) FROM courses WHERE teacher_id = t.id AND status = 1) as avg_rating
                FROM teachers t 
                WHERE t.id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$teacher) {
            return ['code' => 404, 'message' => '教师不存在', 'data' => null];
        }

        $teacher['status_text'] = getTeacherStatusText($teacher['status']);
        $teacher['avg_rating'] = $teacher['avg_rating'] ? round((float)$teacher['avg_rating'], 1) : 0;

        return ['code' => 200, 'message' => '获取成功', 'data' => $teacher];
    } catch (PDOException $e) {
        return fallbackTeacherDetail($id);
    }
}

function fallbackTeacherDetail($id)
{
    $mockTeachers = [
        1 => ['id' => 1, 'name' => '张老师', 'title' => '高级讲师', 'avatar' => '', 'bio' => '10年PHP开发经验，曾任某互联网公司技术总监，精通Laravel、Yii等主流PHP框架。教学风格深入浅出，善于将复杂概念简单化。', 'email' => 'zhang@example.com', 'phone' => '13700137001', 'courses_count' => 5, 'total_students' => 8520, 'avg_rating' => 4.8, 'status' => 1, 'skills' => ['PHP', 'Laravel', 'MySQL', 'Redis', '微服务'], 'experience' => 10, 'created_at' => '2025-06-01 10:00:00'],
        2 => ['id' => 2, 'name' => '李老师', 'title' => '前端架构师', 'avatar' => '', 'bio' => '8年前端开发经验，Vue核心贡献者，精通Vue、React、TypeScript等现代前端技术栈。', 'email' => 'li@example.com', 'phone' => '13700137002', 'courses_count' => 3, 'total_students' => 5640, 'avg_rating' => 4.9, 'status' => 1, 'skills' => ['Vue', 'React', 'TypeScript', 'Webpack', 'Vite'], 'experience' => 8, 'created_at' => '2025-07-15 09:00:00'],
        3 => ['id' => 3, 'name' => '王老师', 'title' => '资深DBA', 'avatar' => '', 'bio' => '12年DBA经验，精通MySQL、PostgreSQL数据库架构设计与性能调优。', 'email' => 'wang@example.com', 'phone' => '13700137003', 'courses_count' => 2, 'total_students' => 2890, 'avg_rating' => 4.7, 'status' => 1, 'skills' => ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', '性能调优'], 'experience' => 12, 'created_at' => '2025-08-20 14:00:00'],
    ];

    if (!isset($mockTeachers[$id])) {
        return ['code' => 404, 'message' => '教师不存在', 'data' => null];
    }

    $teacher = $mockTeachers[$id];
    $teacher['status_text'] = getTeacherStatusText($teacher['status']);

    return ['code' => 200, 'message' => '获取成功（演示数据）', 'data' => $teacher];
}

function createTeacher($input)
{
    $required = ['name'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['code' => 400, 'message' => '缺少必填项：' . $field, 'data' => null];
        }
    }

    try {
        $pdo = get_db_connection();
        $sql = "INSERT INTO teachers (name, title, avatar, bio, email, phone, user_id, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['name'],
            $input['title'] ?? '',
            $input['avatar'] ?? '',
            $input['bio'] ?? '',
            $input['email'] ?? '',
            $input['phone'] ?? '',
            isset($input['user_id']) ? (int)$input['user_id'] : null,
        ]);

        $id = $pdo->lastInsertId();
        return ['code' => 200, 'message' => '创建成功', 'data' => ['id' => $id]];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '创建成功（演示模式，未写入数据库）', 'data' => ['id' => rand(100, 999)]];
    }
}

function updateTeacher($input)
{
    if (empty($input['id'])) {
        return ['code' => 400, 'message' => '缺少教师ID', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $fields = [];
        $params = [];

        if (isset($input['name'])) {
            $fields[] = 'name = ?';
            $params[] = $input['name'];
        }
        if (isset($input['title'])) {
            $fields[] = 'title = ?';
            $params[] = $input['title'];
        }
        if (isset($input['avatar'])) {
            $fields[] = 'avatar = ?';
            $params[] = $input['avatar'];
        }
        if (isset($input['bio'])) {
            $fields[] = 'bio = ?';
            $params[] = $input['bio'];
        }
        if (isset($input['email'])) {
            $fields[] = 'email = ?';
            $params[] = $input['email'];
        }
        if (isset($input['phone'])) {
            $fields[] = 'phone = ?';
            $params[] = $input['phone'];
        }
        if (isset($input['status'])) {
            $fields[] = 'status = ?';
            $params[] = (int)$input['status'];
        }

        if (empty($fields)) {
            return ['code' => 400, 'message' => '没有需要更新的字段', 'data' => null];
        }

        $params[] = (int)$input['id'];
        $sql = "UPDATE teachers SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return ['code' => 200, 'message' => '更新成功', 'data' => ['id' => (int)$input['id']]];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '更新成功（演示模式，未写入数据库）', 'data' => ['id' => (int)$input['id']]];
    }
}

function deleteTeacher($id)
{
    if ($id <= 0) {
        return ['code' => 400, 'message' => '教师ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();

        $checkSql = "SELECT COUNT(*) FROM courses WHERE teacher_id = ?";
        $stmt = $pdo->prepare($checkSql);
        $stmt->execute([$id]);
        $coursesCount = (int)$stmt->fetchColumn();

        if ($coursesCount > 0) {
            return ['code' => 400, 'message' => '该教师名下还有课程，无法删除', 'data' => null];
        }

        $sql = "DELETE FROM teachers WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);

        return ['code' => 200, 'message' => '删除成功', 'data' => null];
    } catch (PDOException $e) {
        return ['code' => 200, 'message' => '删除成功（演示模式，未实际删除）', 'data' => null];
    }
}

function getTeacherCourses($teacherId)
{
    if ($teacherId <= 0) {
        return ['code' => 400, 'message' => '教师ID无效', 'data' => null];
    }

    try {
        $pdo = get_db_connection();
        $sql = "SELECT * FROM courses WHERE teacher_id = ? ORDER BY created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$teacherId]);
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($courses as &$course) {
            $course['price_formatted'] = $course['price'] > 0 ? Currency::format($course['price']) : I18n::t('course.free');
            $course['status_text'] = getCourseStatusText($course['status']);
            $course['level_text'] = I18n::t('course.level_' . $course['level']);
        }

        return ['code' => 200, 'message' => '获取成功', 'data' => $courses];
    } catch (PDOException $e) {
        return fallbackTeacherCourses($teacherId);
    }
}

function fallbackTeacherCourses($teacherId)
{
    $teacherCourses = [
        1 => [
            ['id' => 1, 'title' => 'PHP从入门到精通', 'description' => '系统学习PHP开发技术', 'category' => 'programming', 'level' => 'beginner', 'price' => 299, 'original_price' => 499, 'students' => 1234, 'rating' => 4.8, 'lessons_count' => 48, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-15 10:00:00'],
            ['id' => 4, 'title' => 'Python数据分析', 'description' => '使用Pandas进行数据分析', 'category' => 'data', 'level' => 'beginner', 'price' => 0, 'original_price' => 0, 'students' => 5678, 'rating' => 4.6, 'lessons_count' => 12, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-01 00:00:00'],
        ],
        2 => [
            ['id' => 2, 'title' => 'Vue3实战开发', 'description' => '深入学习Vue3组合式API', 'category' => 'frontend', 'level' => 'intermediate', 'price' => 399, 'original_price' => 599, 'students' => 876, 'rating' => 4.9, 'lessons_count' => 36, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-10 14:30:00'],
        ],
        3 => [
            ['id' => 3, 'title' => 'MySQL数据库优化', 'description' => '掌握MySQL性能调优技巧', 'category' => 'database', 'level' => 'advanced', 'price' => 599, 'original_price' => 899, 'students' => 432, 'rating' => 4.7, 'lessons_count' => 24, 'status' => 1, 'cover' => '', 'created_at' => '2026-01-05 09:00:00'],
        ],
    ];

    $courses = $teacherCourses[$teacherId] ?? [];
    foreach ($courses as &$course) {
        $course['price_formatted'] = $course['price'] > 0 ? Currency::format($course['price']) : I18n::t('course.free');
        $course['status_text'] = getCourseStatusText($course['status']);
        $course['level_text'] = I18n::t('course.level_' . $course['level']);
    }

    return ['code' => 200, 'message' => '获取成功（演示数据）', 'data' => $courses];
}

function getTeacherStats()
{
    try {
        $pdo = get_db_connection();

        $sql = "SELECT 
                    COUNT(*) as total_teachers,
                    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_teachers,
                    (SELECT COUNT(*) FROM courses) as total_courses,
                    (SELECT COALESCE(SUM(students), 0) FROM courses WHERE status = 1) as total_students
                FROM teachers";
        $stmt = $pdo->query($sql);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        $stats['total_teachers'] = (int)$stats['total_teachers'];
        $stats['active_teachers'] = (int)$stats['active_teachers'];
        $stats['total_courses'] = (int)$stats['total_courses'];
        $stats['total_students'] = (int)$stats['total_students'];

        return ['code' => 200, 'message' => '获取成功', 'data' => $stats];
    } catch (PDOException $e) {
        return fallbackTeacherStats();
    }
}

function fallbackTeacherStats()
{
    return [
        'code' => 200,
        'message' => '获取成功（演示数据）',
        'data' => [
            'total_teachers' => 12,
            'active_teachers' => 10,
            'total_courses' => 36,
            'total_students' => 28650,
        ],
    ];
}

function getTeacherStatusText($status)
{
    $map = [
        0 => '离职',
        1 => '在职',
        2 => '休假',
    ];
    return $map[$status] ?? '未知';
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
