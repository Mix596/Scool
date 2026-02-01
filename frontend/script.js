// ==================== SCool Server for Railway with MySQL ====================
console.log('🚀 SCool Server запускается на Railway...');

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Конфигурация:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'production'}`);

// ==================== ПОДКЛЮЧЕНИЕ К MySQL ====================
console.log('\n🔌 Проверка подключения к MySQL...');

let mysql;
let pool = null;

try {
    mysql = require('mysql2/promise');
    console.log('✅ mysql2/promise загружен');
} catch (err) {
    console.error('❌ Ошибка загрузки mysql2:', err.message);
    console.log('⚠️  Устанавливаем mysql2...');
    // mysql будет отсутствовать, но сервер запустится
}

// Функция инициализации базы данных
async function initializeDatabase() {
    const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL;
    
    if (!MYSQL_URL) {
        console.log('❌ MYSQL_URL не найдена в переменных окружения');
        console.log('⚠️  В Railway Dashboard добавьте переменную MYSQL_URL');
        console.log('⚠️  Сервер запустится без базы данных');
        return null;
    }

    try {
        console.log('🔗 Подключаемся к MySQL...');
        
        // Маскируем URL для безопасности
        const maskedUrl = MYSQL_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
        console.log(`   База данных: ${maskedUrl}`);
        
        const poolConfig = {
            uri: MYSQL_URL,
            ssl: { rejectUnauthorized: false },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 10000,
            timezone: 'Z',
            charset: 'utf8mb4'
        };

        pool = mysql.createPool(poolConfig);
        
        // Тестируем подключение
        const connection = await pool.getConnection();
        console.log('✅ Подключение к MySQL успешно!');
        
        // Получаем информацию о БД
        const [versionRows] = await connection.query('SELECT VERSION() as version');
        const [dbRows] = await connection.query('SELECT DATABASE() as db, USER() as user');
        
        console.log(`   Версия MySQL: ${versionRows[0].version}`);
        console.log(`   База данных: ${dbRows[0].db || 'Не выбрана'}`);
        console.log(`   Пользователь: ${dbRows[0].user}`);
        
        // Проверяем и создаем таблицы если нужно
        await checkAndCreateTables(connection);
        
        connection.release();
        return pool;
        
    } catch (err) {
        console.error('❌ Ошибка подключения к MySQL:', err.message);
        console.error('   Код ошибки:', err.code);
        return null;
    }
}

// Проверка и создание таблиц
async function checkAndCreateTables(connection) {
    try {
        console.log('\n📊 Проверяем структуру базы данных...');
        
        // Используем базу данных из подключения
        const [dbRows] = await connection.query('SELECT DATABASE() as db');
        const dbName = dbRows[0].db;
        
        if (dbName) {
            await connection.query(`USE \`${dbName}\``);
            console.log(`   Используем базу данных: ${dbName}`);
        }
        
        // Таблица пользователей
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                class INT DEFAULT 7,
                full_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Таблица users готова');
        
        // Таблица лидеров
        await connection.query(`
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                username VARCHAR(50),
                name VARCHAR(100) NOT NULL,
                score INT DEFAULT 0,
                \`rank\` INT DEFAULT 999,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Таблица leaderboard готова');
        
        // Таблица предметов
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                class INT NOT NULL,
                progress INT DEFAULT 0,
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_subject_class (name, class, user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Таблица subjects готова');
        
        // Добавляем тестовые данные если таблицы пустые
        await seedDatabase(connection);
        
    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err.message);
    }
}

// Добавление тестовых данных
async function seedDatabase(connection) {
    try {
        console.log('\n🌱 Проверяем наличие тестовых данных...');
        
        // Проверяем users
        const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(usersCount[0].count) === 0) {
            await connection.query(`
                INSERT INTO users (username, email, password, class, full_name) VALUES
                ('test_user', 'test@example.com', 'test123', 7, 'Тестовый Пользователь'),
                ('elena_v', 'elena@example.com', 'password123', 9, 'Елена Васильева'),
                ('vasya_p', 'vasya@example.com', 'password123', 8, 'Василий Петров')
            `);
            console.log('✅ Добавлены тестовые пользователи');
        }
        
        // Проверяем leaderboard
        const [leaderboardCount] = await connection.query('SELECT COUNT(*) as count FROM leaderboard');
        if (parseInt(leaderboardCount[0].count) === 0) {
            await connection.query(`
                INSERT INTO leaderboard (username, name, score, \`rank\`) VALUES
                ('elena_v', 'Елена Васильева', 1200, 1),
                ('vasya_p', 'Василий Петров', 1000, 2),
                ('test_user', 'Тестовый Пользователь', 900, 3)
            `);
            console.log('✅ Добавлены тестовые данные в leaderboard');
        }
        
        // Проверяем subjects
        const [subjectsCount] = await connection.query('SELECT COUNT(*) as count FROM subjects');
        if (parseInt(subjectsCount[0].count) === 0) {
            await connection.query(`
                INSERT INTO subjects (name, class, progress) VALUES
                ('Физика', 7, 25),
                ('Математика', 7, 45),
                ('Химия', 7, 15),
                ('Физика', 8, 35),
                ('Математика', 8, 60),
                ('Физика', 9, 55),
                ('Математика', 9, 75)
            `);
            console.log('✅ Добавлены тестовые предметы');
        }
        
    } catch (err) {
        console.error('❌ Ошибка добавления тестовых данных:', err.message);
    }
}

// ==================== ОБСЛУЖИВАНИЕ ФРОНТЕНДА ====================
console.log('\n📁 Ищем фронтенд...');

const projectRoot = process.cwd();
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

if (frontendExists) {
    console.log(`✅ Фронтенд найден в: ${frontendPath}`);
    app.use(express.static(frontendPath));
    console.log('✅ Статические файлы настроены');
} else {
    console.log('⚠️  Фронтенд не найден');
    console.log('   Создайте папку "frontend" с index.html, style.css и script.js');
}

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== API ENDPOINTS ====================

// Главная страница
app.get('/', (req, res) => {
    if (frontendExists) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.json({
            message: 'SCool API Server',
            status: 'running',
            version: '1.0.0',
            database: pool ? 'connected' : 'not connected',
            timestamp: new Date().toISOString(),
            endpoints: {
                health: '/health',
                subjects: '/api/subjects/:class',
                leaderboard: '/api/leaderboard',
                login: 'POST /api/login',
                register: 'POST /api/register'
            }
        });
    }
});

// Проверка здоровья сервера
app.get('/health', async (req, res) => {
    const health = {
        status: 'checking',
        service: 'scool-api',
        timestamp: new Date().toISOString(),
        port: PORT,
        frontend: frontendExists ? 'available' : 'not found',
        database: 'checking'
    };

    try {
        if (pool) {
            await pool.query('SELECT 1');
            health.database = 'connected';
            health.status = 'healthy';
        } else {
            health.database = 'disconnected';
            health.status = 'degraded';
        }
        
        res.status(200).json(health);
        
    } catch (err) {
        health.database = 'error';
        health.database_error = err.message;
        health.status = 'unhealthy';
        res.status(200).json(health);
    }
});

// ========== API ДЛЯ ФРОНТЕНДА ==========

// Получить все предметы для класса
app.get('/api/subjects/:class', async (req, res) => {
    const classNum = parseInt(req.params.class);
    
    if (!pool) {
        return res.status(503).json({
            error: 'Database not available',
            message: 'MySQL connection not established'
        });
    }
    
    try {
        const [rows] = await pool.query(
            'SELECT * FROM subjects WHERE class = ? ORDER BY name',
            [classNum]
        );
        
        res.json(rows);
        
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({
            error: 'Database query failed',
            message: err.message
        });
    }
});

// Получить таблицу лидеров
app.get('/api/leaderboard', async (req, res) => {
    if (!pool) {
        return res.status(503).json({
            error: 'Database not available',
            message: 'MySQL connection not established'
        });
    }
    
    try {
        const [rows] = await pool.query(
            'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 20'
        );
        
        res.json(rows);
        
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({
            error: 'Database query failed',
            message: err.message
        });
    }
});

// Получить топ 10
app.get('/api/top10', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const [rows] = await pool.query(
            'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 10'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Поиск
app.get('/api/search', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json([]);
        }
        
        const searchTerm = `%${q}%`;
        
        // Ищем в leaderboard
        const [leaderboardResults] = await pool.query(
            'SELECT name, username, score, \`rank\` FROM leaderboard WHERE name LIKE ? OR username LIKE ? LIMIT 5',
            [searchTerm, searchTerm]
        );
        
        // Ищем в subjects
        const [subjectsResults] = await pool.query(
            'SELECT name, class, progress FROM subjects WHERE name LIKE ? LIMIT 5',
            [searchTerm]
        );
        
        const results = [
            ...leaderboardResults.map(item => ({
                title: `${item.name} (${item.score} баллов)`,
                description: `Рейтинг: ${item.rank}`,
                type: 'Ученик',
                icon: 'fas fa-user-graduate',
                data: item
            })),
            ...subjectsResults.map(item => ({
                title: `${item.name} - ${item.class} класс`,
                description: `Прогресс: ${item.progress}%`,
                type: 'Предмет',
                icon: 'fas fa-book',
                data: item
            }))
        ];
        
        res.json(results);
        
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== АВТОРИЗАЦИЯ ==========

// Вход
app.post('/api/login', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection not available' 
        });
    }
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email и пароль обязательны' 
            });
        }
        
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        const user = rows[0];
        
        // Простая проверка пароля (в production используйте bcrypt!)
        if (user.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный пароль' 
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.full_name || user.username,
                username: user.username,
                class_number: user.class
            },
            token: `token_${user.id}_${Date.now()}`,
            message: 'Вход выполнен успешно'
        });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Регистрация
app.post('/api/register', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection not available' 
        });
    }
    
    try {
        const { email, password, fullName, classNumber } = req.body;
        
        if (!email || !password || !fullName || !classNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Все поля обязательны' 
            });
        }
        
        // Проверяем, существует ли пользователь
        const [existing] = await pool.query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Пользователь с таким email уже существует' 
            });
        }
        
        const username = email.split('@')[0];
        
        // Создаем пользователя
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, class, full_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, password, classNumber, fullName]
        );
        
        const userId = result.insertId;
        
        // Добавляем в таблицу лидеров
        try {
            await pool.query(
                'INSERT INTO leaderboard (user_id, username, name, score) VALUES (?, ?, ?, 0)',
                [userId, username, fullName]
            );
        } catch (err) {
            console.log('User not added to leaderboard:', err.message);
        }
        
        // Создаем предметы по умолчанию
        const defaultSubjects = [
            ['Физика', classNumber, 0],
            ['Математика', classNumber, 0],
            ['Химия', classNumber, 0]
        ];
        
        for (const [name, cls, progress] of defaultSubjects) {
            try {
                await pool.query(
                    'INSERT INTO subjects (name, class, progress, user_id) VALUES (?, ?, ?, ?)',
                    [name, cls, progress, userId]
                );
            } catch (err) {
                console.log(`Subject ${name} not added:`, err.message);
            }
        }
        
        res.json({
            success: true,
            user: {
                id: userId,
                email: email,
                name: fullName,
                username: username,
                class_number: classNumber
            },
            token: `token_${userId}_${Date.now()}`,
            message: 'Регистрация успешна'
        });
        
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Получить информацию о пользователе
app.get('/api/user/:id', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection not available' 
        });
    }
    
    try {
        const userId = parseInt(req.params.id);
        
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        const user = rows[0];
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.full_name || user.username,
                username: user.username,
                class_number: user.class
            }
        });
        
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Обновить прогресс предмета
app.post('/api/subject-progress', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection not available' 
        });
    }
    
    try {
        const { userId, subjectName, classNumber, progress } = req.body;
        
        if (!userId || !subjectName || !classNumber || progress === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Не все поля заполнены' 
            });
        }
        
        await pool.query(`
            INSERT INTO subjects (name, class, progress, user_id) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                progress = VALUES(progress),
                updated_at = CURRENT_TIMESTAMP
        `, [subjectName, classNumber, progress, userId]);
        
        res.json({ 
            success: true, 
            message: 'Прогресс обновлен'
        });
        
    } catch (err) {
        console.error('Update progress error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Обновить счет
app.post('/api/update-score', async (req, res) => {
    if (!pool) {
        return res.status(503).json({ 
            success: false, 
            message: 'Database connection not available' 
        });
    }
    
    try {
        const { userId, score } = req.body;
        
        if (!userId || score === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Не все поля заполнены' 
            });
        }
        
        // Получаем пользователя
        const [userRows] = await pool.query(
            'SELECT username, full_name FROM users WHERE id = ?',
            [userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        const user = userRows[0];
        
        // Обновляем или создаем запись в leaderboard
        await pool.query(`
            INSERT INTO leaderboard (user_id, username, name, score) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                score = VALUES(score),
                updated_at = CURRENT_TIMESTAMP
        `, [userId, user.username, user.full_name, score]);
        
        // Пересчитываем ранги
        await pool.query(`
            SET @rank_num = 0;
            UPDATE leaderboard 
            SET \`rank\` = (@rank_num := @rank_num + 1)
            ORDER BY score DESC;
        `);
        
        // Получаем обновленный ранг
        const [rankRows] = await pool.query(
            'SELECT \`rank\` FROM leaderboard WHERE user_id = ?',
            [userId]
        );
        
        const rank = rankRows[0]?.rank || 999;
        
        res.json({
            success: true,
            message: 'Счет обновлен',
            rank: rank,
            score: score
        });
        
    } catch (err) {
        console.error('Update score error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ==================== ОБРАБОТКА ОШИБОК ====================

// 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        available_endpoints: [
            'GET /health',
            'GET /api/subjects/:class',
            'GET /api/leaderboard',
            'GET /api/top10',
            'GET /api/search?q=...',
            'POST /api/login',
            'POST /api/register',
            'POST /api/subject-progress',
            'POST /api/update-score'
        ]
    });
});

// Fallback для SPA
app.get('*', (req, res) => {
    if (frontendExists) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.status(404).json({
            error: 'Not found',
            message: 'Frontend not found. Create a "frontend" folder with index.html'
        });
    }
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== ЗАПУСК СЕРВЕРА ====================
async function startServer() {
    try {
        // Инициализируем базу данных
        if (mysql) {
            pool = await initializeDatabase();
        } else {
            console.log('⚠️  mysql2 не установлен, база данных недоступна');
            console.log('   Для установки: npm install mysql2');
        }
        
        // Запускаем сервер
        app.listen(PORT, '0.0.0.0', () => {
            console.log('\n' + '='.repeat(60));
            console.log(`✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ: ${PORT}`);
            console.log(`   Локально: http://localhost:${PORT}`);
            console.log('='.repeat(60));
            console.log('\n📡 ДОСТУПНЫЕ ЭНДПОИНТЫ:');
            console.log(`   Главная: http://localhost:${PORT}/`);
            console.log(`   Health:  http://localhost:${PORT}/health`);
            console.log(`   API Docs: http://localhost:${PORT}/api/`);
            console.log('\n💾 БАЗА ДАННЫХ:');
            console.log(`   Статус: ${pool ? '✅ Подключена' : '❌ Не подключена'}`);
            if (!pool) {
                console.log('   Для подключения к MySQL:');
                console.log('   1. В Railway Dashboard добавьте MySQL плагин');
                console.log('   2. Добавьте переменную MYSQL_URL');
            }
            console.log('\n🚀 Готово к использованию!');
            console.log('='.repeat(60));
        });
        
    } catch (err) {
        console.error('❌ Ошибка запуска сервера:', err);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🔻 Получен SIGTERM - завершаем работу...');
    if (pool) {
        pool.end(() => {
            console.log('   Пул соединений с БД закрыт');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGINT', () => {
    console.log('\n🔻 Получен SIGINT - завершаем работу...');
    if (pool) {
        pool.end(() => {
            console.log('   Пул соединений с БД закрыт');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});
