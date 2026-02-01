Вот **полные готовые коды** для всех файлов:

## 📁 **1. server.js (полная версия)**

```javascript
// ========== RAILWAY EMERGENCY PORT FIX ==========
console.log('='.repeat(60));
console.log('🚀 SCool SERVER - Railway Production');
console.log('='.repeat(60));

console.log('ALL ENVIRONMENT VARIABLES:');
for (const key in process.env) {
  if (key.includes('PORT') || key.includes('RAILWAY') || key.includes('MYSQL')) {
    console.log(`  ${key}=${key.includes('PASSWORD') || key.includes('URL') ? '******' : process.env[key]}`);
  }
}

let detectedPort = null;

if (process.env.PORT) {
  detectedPort = parseInt(process.env.PORT);
  console.log(` Found port in process.env.PORT: ${detectedPort}`);
} else {
  detectedPort = 8080;
  console.log(` No port detected, using Railway default: ${detectedPort}`);
}

console.log('='.repeat(60));
console.log(' SCool Server - Railway Production');
console.log('='.repeat(60));
console.log(` Railway PORT variable: "${process.env.PORT}"`);
console.log(` Using PORT: ${detectedPort}`);
console.log(` NODE_ENV: ${process.env.NODE_ENV || 'production'}`);
console.log(` Listen address: 0.0.0.0`);
console.log('='.repeat(60));

// ========== RAILWAY MYSQL CONFIGURATION ==========
console.log('\n🔌 CONNECTING TO RAILWAY MYSQL...');
console.log('='.repeat(30));

const mysqlVars = {};
let mysqlUrl = null;

for (const key in process.env) {
  if (key.includes('MYSQL')) {
    if (key === 'MYSQL_URL') {
      mysqlUrl = process.env[key];
      mysqlVars[key] = 'mysql://****:****@****/railway';
    } else if (key.includes('PASSWORD')) {
      mysqlVars[key] = '******';
    } else {
      mysqlVars[key] = process.env[key];
    }
  }
}

console.log('MySQL Variables:', mysqlVars);
console.log(` MYSQL_URL found: ${!!mysqlUrl}`);
console.log('='.repeat(60));

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Проверяем наличие mysql2 модуля
try {
  require('mysql2/promise');
  console.log(`✅ mysql2 module loaded`);
} catch (err) {
  console.error('❌ ERROR loading mysql2 module:', err.message);
  process.exit(1);
}

const mysql = require('mysql2/promise');

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== БАЗА ДАННЫХ ==========
console.log('\n💾 DATABASE CONFIGURATION:');
let pool = null;

async function initializeDatabase() {
  if (!mysqlUrl) {
    console.log('❌ MYSQL_URL not found');
    console.log('⚠️  В Railway добавьте переменную: MYSQL_URL = ${{ MySQL.MYSQL_URL }}');
    throw new Error('MYSQL_URL is required for production');
  }

  try {
    console.log('🔌 Connecting to existing Railway MySQL database...');
    
    const maskedUrl = mysqlUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`   Database URL: ${maskedUrl}`);
    
    const poolConfig = {
      uri: mysqlUrl,
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
    console.log('✅ DATABASE CONNECTED');
    
    // Получаем информацию о подключении
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    const [dbRows] = await connection.query('SELECT DATABASE() as db, USER() as user');
    
    console.log(`   Database: ${dbRows[0].db || 'Not selected'}`);
    console.log(`   User: ${dbRows[0].user}`);
    console.log(`   MySQL Version: ${versionRows[0].version}`);
    
    // Проверяем существующие таблицы
    await checkAndCreateTables(connection);
    
    connection.release();
    
    return pool;
    
  } catch (err) {
    console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    console.error('   Error code:', err.code);
    throw new Error(`Cannot connect to Railway MySQL: ${err.message}`);
  }
}

// Проверка и создание таблиц если их нет
async function checkAndCreateTables(connection) {
  try {
    console.log('\n🔍 CHECKING DATABASE TABLES...');
    
    // Создаем базу данных если не существует
    await connection.query('CREATE DATABASE IF NOT EXISTS railway');
    await connection.query('USE railway');
    
    // Таблица users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        class INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT class_check CHECK (class >= 1 AND class <= 11)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ users table ready');
    
    // Таблица leaderboard
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        score INT DEFAULT 0,
        \`rank\` INT DEFAULT 999,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ leaderboard table ready');
    
    // Таблица subjects
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        class INT NOT NULL,
        progress INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT progress_check CHECK (progress >= 0 AND progress <= 100),
        UNIQUE KEY unique_subject_class (name, class)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ subjects table ready');
    
    // Добавляем тестовые данные если таблицы пустые
    await seedDatabase(connection);
    
  } catch (err) {
    console.error('❌ DATABASE SETUP ERROR:', err.message);
  }
}

// Добавление тестовых данных
async function seedDatabase(connection) {
  try {
    console.log('\n🌱 SEEDING DATABASE WITH TEST DATA...');
    
    // Проверяем users
    const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(usersCount[0].count) === 0) {
      await connection.query(`
        INSERT INTO users (username, email, password, class) VALUES
        ('elena_v', 'elena@example.com', 'password123', 10),
        ('vasya_p', 'vasya@example.com', 'password123', 9),
        ('evgeniy_s', 'evgeniy@example.com', 'password123', 11),
        ('maria_k', 'maria@example.com', 'password123', 8),
        ('alex_t', 'alex@example.com', 'password123', 10)
      `);
      console.log('✅ Test users added');
    }
    
    // Проверяем leaderboard
    const [leaderboardCount] = await connection.query('SELECT COUNT(*) as count FROM leaderboard');
    if (parseInt(leaderboardCount[0].count) === 0) {
      await connection.query(`
        INSERT INTO leaderboard (username, name, score, \`rank\`) VALUES
        ('elena_v', 'Елена Васильева', 1200, 1),
        ('vasya_p', 'Василий Петров', 1000, 2),
        ('evgeniy_s', 'Евгений Сидоров', 900, 3),
        ('maria_k', 'Мария Кузнецова', 850, 4),
        ('alex_t', 'Алексей Тихонов', 800, 5)
      `);
      console.log('✅ Test leaderboard added');
    }
    
    // Проверяем subjects
    const [subjectsCount] = await connection.query('SELECT COUNT(*) as count FROM subjects');
    if (parseInt(subjectsCount[0].count) === 0) {
      await connection.query(`
        INSERT INTO subjects (name, class, progress) VALUES
        ('Физика', 7, 14),
        ('Математика', 7, 45),
        ('Химия', 7, 28),
        ('Биология', 7, 32),
        ('Физика', 8, 22),
        ('Алгебра', 8, 51),
        ('Геометрия', 8, 38),
        ('Информатика', 8, 67),
        ('Физика', 9, 58),
        ('Математика', 9, 72),
        ('Химия', 9, 41),
        ('Биология', 9, 36)
      `);
      console.log('✅ Test subjects added');
    }
    
    console.log('✅ Database seeding complete');
    
  } catch (err) {
    console.error('❌ SEEDING ERROR:', err.message);
  }
}

// ========== ПУТИ К ФАЙЛАМ ==========
const projectRoot = process.cwd();
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

console.log('\n📁 FILE SYSTEM PATHS:');
console.log(`   Project Root: ${projectRoot}`);
console.log(`   Frontend Dir: ${frontendPath}`);
console.log(`   Frontend Exists: ${frontendExists ? '✅ YES' : '❌ NO'}`);

if (frontendExists) {
  console.log('\n   FRONTEND FILES:');
  const files = fs.readdirSync(frontendPath);
  files.slice(0, 10).forEach(file => console.log(`      ${file}`));
  if (files.length > 10) console.log(`      ... and ${files.length - 10} more`);
}
console.log('='.repeat(60));

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========
if (frontendExists) {
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  console.log('✅ Static files configured');
}

// ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
initializeDatabase().then(() => {
  console.log('\n✅ DATABASE INITIALIZATION COMPLETE');
  console.log('✅ SERVER READY TO USE RAILWAY MYSQL DATABASE');
}).catch(err => {
  console.error('\n❌ DATABASE INIT FAILED:', err.message);
  console.error('❌ SERVER CANNOT START WITHOUT DATABASE CONNECTION');
  process.exit(1);
});

// ========== API ENDPOINTS ==========

// Главная страница API
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCool API - Production',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: detectedPort,
    database: pool ? 'connected' : 'disconnected',
    documentation: {
      auth: {
        login: 'POST /api/login',
        register: 'POST /api/register',
        user: 'GET /api/user'
      },
      data: {
        subjects: 'GET /api/subjects/:class',
        leaderboard: 'GET /api/leaderboard',
        score: 'POST /api/score',
        subject_progress: 'POST /api/subject-progress',
        search: 'GET /api/search?q=...',
        classes: 'GET /api/classes',
        users_by_class: 'GET /api/users/class/:class',
        top10: 'GET /api/top10'
      },
      system: {
        health: '/health',
        db_info: '/api/db-info'
      }
    },
    info: 'Using Railway MySQL database'
  });
});

// Проверка здоровья
app.get('/health', async (req, res) => {
  const health = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    service: 'scool-api',
    port: detectedPort,
    environment: process.env.NODE_ENV || 'production',
    database: 'checking'
  };

  try {
    if (pool) {
      await pool.query('SELECT 1');
      health.database = 'connected';
      health.database_status = 'healthy';
      health.status = 'healthy';
      
      const [dbRows] = await pool.query('SELECT DATABASE() as db');
      health.database_name = dbRows[0].db;
    } else {
      health.database = 'disconnected';
      health.database_status = 'no_pool';
      health.status = 'unhealthy';
    }
    
    res.status(200).json(health);
    
  } catch (err) {
    health.database = 'error';
    health.database_error = err.message;
    health.status = 'unhealthy';
    res.status(200).json(health);
  }
});

// Информация о базе данных
app.get('/api/db-info', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: 'database_error',
      message: 'Database connection not established',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const [versionRows] = await pool.query('SELECT VERSION() as version');
    const [dbRows] = await pool.query('SELECT DATABASE() as db');
    
    const [tables] = await pool.query('SHOW TABLES');
    
    const tableCounts = {};
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      try {
        const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        tableCounts[tableName] = countRows[0].count;
      } catch (err) {
        tableCounts[tableName] = 'error';
      }
    }
    
    res.json({
      status: 'connected',
      database: 'Railway MySQL',
      version: versionRows[0].version,
      current_database: dbRows[0].db,
      tables_count: tables.length,
      tables: tables.map(t => ({
        name: Object.values(t)[0],
        records: tableCounts[Object.values(t)[0]]
      })),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'database_error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ==========

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
      'SELECT * FROM users WHERE email = ? AND password = ?', 
      [email, password]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }
    
    const user = rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        class_number: user.class
      },
      token: 'demo-token-' + Date.now(),
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
    
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, class) VALUES (?, ?, ?, ?)',
      [username, email, password, classNumber]
    );
    
    try {
      await pool.query(
        'INSERT INTO leaderboard (username, name, score) VALUES (?, ?, 0)',
        [username, fullName]
      );
    } catch (err) {
      console.log('User not added to leaderboard:', err.message);
    }
    
    res.json({
      success: true,
      user: {
        id: result.insertId,
        email: email,
        name: fullName,
        class_number: classNumber
      },
      token: 'demo-token-' + Date.now(),
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

app.get('/api/user', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database connection not available' 
    });
  }
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен не предоставлен' 
      });
    }
    
    const [rows] = await pool.query('SELECT * FROM users LIMIT 1');
    
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
        name: user.username,
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

// ========== ОСНОВНЫЕ ЭНДПОИНТЫ ДАННЫХ ==========

app.get('/api/subjects/:class', async (req, res) => {
  const classNum = parseInt(req.params.class);
  
  if (!pool) {
    return res.status(503).json({
      status: 'database_error',
      message: 'Database connection not available',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM subjects WHERE class = ? ORDER BY name',
      [classNum]
    );
    
    res.json(rows);
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database query failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: 'database_error',
      message: 'Database connection not available',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 20'
    );
    
    res.json(rows);
    
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database query failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/score', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database connection not available' 
    });
  }
  
  try {
    const { username, name, score } = req.body;
    
    if (!username || !name || score === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      await connection.query(`
        INSERT INTO leaderboard (username, name, score) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          score = VALUES(score), 
          name = VALUES(name),
          updated_at = CURRENT_TIMESTAMP
      `, [username, name, score]);
      
      await connection.query(`
        SET @rank_num = 0;
        UPDATE leaderboard 
        SET \`rank\` = (@rank_num := @rank_num + 1)
        ORDER BY score DESC;
      `);
      
      await connection.commit();
      
      const [result] = await connection.query(
        'SELECT * FROM leaderboard WHERE username = ?',
        [username]
      );
      
      res.json({
        success: true,
        rank: result[0]?.rank || 999,
        score: score,
        username: username,
        name: name,
        message: 'Score updated successfully'
      });
      
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.post('/api/subject-progress', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database connection not available' 
    });
  }
  
  try {
    const { name, class: classNum, progress } = req.body;
    
    if (!name || !classNum || progress === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    await pool.query(`
      INSERT INTO subjects (name, class, progress) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        progress = VALUES(progress), 
        updated_at = CURRENT_TIMESTAMP
    `, [name, classNum, progress]);
    
    res.json({ 
      success: true, 
      message: 'Progress updated successfully',
      data: { name, class: classNum, progress }
    });
    
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.get('/api/top10', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'Database connection not available' 
    });
  }
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

app.get('/api/search', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'Database connection not available' 
    });
  }
  
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const [leaderboardResults] = await pool.query(
      'SELECT * FROM leaderboard WHERE name LIKE ? OR username LIKE ? LIMIT 5',
      [`%${q}%`, `%${q}%`]
    );
    
    const [subjectsResults] = await pool.query(
      'SELECT * FROM subjects WHERE name LIKE ? LIMIT 5',
      [`%${q}%`]
    );
    
    const results = [
      ...leaderboardResults.map(item => ({
        title: `${item.name} (${item.score} баллов)`,
        description: `Лидерборд - ${item.rank || 'Не оценен'}`,
        type: 'Ученик',
        icon: 'fas fa-user-graduate',
        data: item
      })),
      ...subjectsResults.map(item => ({
        title: `${item.name} - ${item.class} класс`,
        description: `${item.progress || 0}% завершено`,
        type: 'Предмет',
        icon: 'fas fa-book',
        data: item
      }))
    ];
    
    res.json(results);
    
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

app.get('/api/classes', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'Database connection not available' 
    });
  }
  
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT class FROM subjects ORDER BY class'
    );
    
    res.json(rows.map(row => row.class));
    
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

app.get('/api/users/class/:class', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'Database connection not available' 
    });
  }
  
  try {
    const classNum = parseInt(req.params.class);
    
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE class = ?',
      [classNum]
    );
    
    res.json(rows);
    
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

// ========== ФРОНТЕНД РОУТЫ ==========
if (frontendExists) {
  app.get('/app', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  
  app.get('/app/*', (req, res) => {
    const filePath = path.join(frontendPath, req.path.replace('/app', ''));
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
      res.sendFile(filePath);
    } else {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// ========== ОБРАБОТКА ОШИБОК ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    port: detectedPort
  });
});

app.use((req, res) => {
  if (frontendExists && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ 
      error: 'Not found',
      port: detectedPort,
      available_endpoints: [
        '/',
        '/health',
        '/api/db-info',
        '/api/subjects/:class',
        '/api/leaderboard',
        '/api/top10'
      ]
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    port: detectedPort,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
const server = app.listen(detectedPort, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log(`✅ SERVER RUNNING ON PORT: ${detectedPort}`);
  console.log(` Internal URL: http://0.0.0.0:${detectedPort}`);
  console.log(` Local URL:    http://localhost:${detectedPort}`);
  console.log('='.repeat(60));
  console.log('\n📡 PUBLIC ENDPOINTS:');
  console.log(`    Main API:     https://scool-production.up.railway.app/`);
  console.log(`    Health:       https://scool-production.up.railway.app/health`);
  console.log(`    DB Info:      https://scool-production.up.railway.app/api/db-info`);
  console.log(`    Subjects:     https://scool-production.up.railway.app/api/subjects/7`);
  console.log(`    Leaderboard:  https://scool-production.up.railway.app/api/leaderboard`);
  console.log(`    Frontend:     https://scool-production.up.railway.app/app`);
  console.log(`    Login:        POST https://scool-production.up.railway.app/api/login`);
  console.log(`    Register:     POST https://scool-production.up.railway.app/api/register`);
  
  if (pool) {
    console.log(`\n💾 DATABASE:       ✅ CONNECTED TO RAILWAY MYSQL`);
    console.log(`   Service: mysql-volume-_51g`);
    console.log(`   Status: Online`);
  } else {
    console.log(`\n💾 DATABASE:       ❌ DISCONNECTED`);
  }
  
  if (frontendExists) {
    console.log(`\n🌐 FRONTEND:        ✅ DETECTED`);
    console.log(`   App:         https://scool-production.up.railway.app/app`);
  } else {
    console.log(`\n🌐 FRONTEND:        ❌ NOT FOUND`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 USING RAILWAY MYSQL DATABASE');
  console.log(` Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(` Port: ${detectedPort}`);
  console.log(` Database: ${pool ? '✅ Railway MySQL' : '❌ No database'}`);
  console.log('='.repeat(60));
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
  console.log('\n🔻 Received SIGTERM - shutting down gracefully...');
  server.close(() => {
    console.log('   HTTP server closed');
    if (pool) {
      pool.end(() => {
        console.log('   Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('\n🔻 Received SIGINT - shutting down...');
  server.close(() => {
    console.log('   HTTP server closed');
    if (pool) {
      pool.end(() => {
        console.log('   Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});
```

## 📁 **2. script.js (полная версия)**

```javascript
// ==================== КОНФИГУРАЦИЯ ДЛЯ RAILWAY ====================
const API_BASE_URL = window.location.origin;
console.log('🌐 API Base URL:', API_BASE_URL);

let currentUser = null;
let isAuthenticated = false;

// ==================== API ФУНКЦИИ ====================

function saveAuthToken(token) {
    localStorage.setItem('scool_token', token);
}

function getAuthToken() {
    return localStorage.getItem('scool_token');
}

function removeAuthToken() {
    localStorage.removeItem('scool_token');
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ API Error (${endpoint}):`, error.message);
        showCenterMessage(`Ошибка: ${error.message}`, 'fa-exclamation-triangle');
        throw error;
    }
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return data.status === 'healthy' || data.status === 'connected';
    } catch (error) {
        console.warn('Health check failed:', error);
        return false;
    }
}

async function loadServerData() {
    try {
        const isHealthy = await checkServerHealth();
        if (!isHealthy) {
            throw new Error('Сервер недоступен');
        }
        
        console.log('📥 Загружаем данные из MySQL...');
        
        try {
            const leaderboard = await apiRequest('/api/leaderboard');
            if (leaderboard && Array.isArray(leaderboard)) {
                updateAllLeaderboards(leaderboard);
                console.log('✅ Leaderboard загружен из БД');
            } else {
                throw new Error('Нет данных в leaderboard таблице');
            }
        } catch (error) {
            console.error('Ошибка загрузки leaderboard:', error);
            showCenterMessage('Таблица лидеров пуста. Добавьте данные в MySQL', 'fa-database');
        }
        
        if (currentUser && currentUser.class_number) {
            try {
                const subjects = await apiRequest(`/api/subjects/${currentUser.class_number}`);
                if (subjects && Array.isArray(subjects)) {
                    updateSubjectsFromServer(subjects);
                    console.log('✅ Subjects загружены из БД');
                } else {
                    showCenterMessage(`Нет предметов для ${currentUser.class_number} класса`, 'fa-book');
                }
            } catch (error) {
                console.error('Ошибка загрузки subjects:', error);
                showCenterMessage('Добавьте предметы в таблицу subjects в MySQL', 'fa-table');
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error.message);
        showCenterMessage('Не удалось загрузить данные. Проверьте подключение к БД', 'fa-database');
    }
}

function updateSubjectsFromServer(subjectsData) {
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            const subjectCards = layout.querySelectorAll('.subject-card');
            subjectCards.forEach((card, index) => {
                if (subjectsData[index]) {
                    const titleElement = card.querySelector('h3');
                    if (titleElement) {
                        titleElement.textContent = subjectsData[index].name || 'Предмет';
                    }
                    
                    const progressFill = card.querySelector('.progress-fill');
                    const progressText = card.querySelector('.progress-text');
                    
                    const progress = subjectsData[index].progress || 0;
                    
                    if (progressFill) {
                        progressFill.style.width = `${progress}%`;
                    }
                    if (progressText) {
                        progressText.textContent = `${progress}% завершено`;
                    }
                }
            });
        }
    });
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

async function initApp() {
    console.log('🚀 Инициализация SCool для Railway...');
    
    try {
        checkUserSession();
        setupEventListeners();
        initializeAllLayouts();
        
        await loadServerData();
        
        console.log('✅ Приложение успешно инициализировано');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showCenterMessage('Ошибка инициализации приложения', 'fa-exclamation-circle');
    }
}

function checkUserSession() {
    const savedUser = localStorage.getItem('scool_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
            updateUserInterface();
            console.log('👤 Пользователь авторизован:', currentUser);
        } catch (e) {
            console.error('❌ Ошибка парсинга данных пользователя:', e);
            logoutUser();
        }
    }
}

function updateUserInterface() {
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn && currentUser) {
        profileBtn.title = currentUser.name || 'Профиль';
    }
}

function initializeAllLayouts() {
    console.log('📊 Инициализация всех макетов...');
    
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            const subjectCards = layout.querySelectorAll('.subject-card');
            subjectCards.forEach(card => {
                const titleElement = card.querySelector('h3');
                const progressText = card.querySelector('.progress-text');
                if (titleElement) titleElement.textContent = 'Загрузка...';
                if (progressText) progressText.textContent = '0% завершено';
            });
        }
    });
}

function updateAllLeaderboards(leaderboardData) {
    const leaderboards = document.querySelectorAll('.leader-list');
    
    leaderboards.forEach(leaderList => {
        if (!leaderList) return;
        
        leaderList.innerHTML = '';
        
        if (leaderboardData.length === 0) {
            const emptyMsg = document.createElement('li');
            emptyMsg.className = 'leader-item';
            emptyMsg.innerHTML = `
                <div style="text-align: center; width: 100%; padding: 10px; color: #666;">
                    <i class="fas fa-database"></i> Таблица лидеров пуста
                </div>
            `;
            leaderList.appendChild(emptyMsg);
            return;
        }
        
        const topThree = leaderboardData.slice(0, 3);
        
        topThree.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'leader-item';
            const displayName = item.name || item.username || `Ученик ${index + 1}`;
            
            const firstLetter = displayName.charAt(0).toUpperCase();
            const colors = ['#ff5722', '#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
            const color = colors[index % colors.length];
            
            li.innerHTML = `
                <span class="rank">${index + 1}</span>
                <div class="avatar" style="background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%; width: 30px; height: 30px; font-weight: bold;">
                    ${firstLetter}
                </div>
                <span class="name">${displayName}</span>
                <span class="score">${item.score || 0}</span>
            `;
            
            leaderList.appendChild(li);
        });
    });
}

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================

function openAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        switchAuthTab('login');
        clearAuthMessages();
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.remove('show');
        document.body.style.overflow = '';
        clearAuthForms();
    }
}

function switchAuthTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    
    const activeTab = document.querySelector(`.auth-tab-btn[data-tab="${tabName}"]`);
    const activeForm = document.getElementById(`${tabName}-form`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeForm) activeForm.classList.add('active');
    
    clearAuthMessages();
}

function clearAuthForms() {
    document.getElementById('login-form')?.reset();
    document.getElementById('register-form')?.reset();
    clearAuthMessages();
}

function clearAuthMessages() {
    const messages = document.querySelectorAll('.auth-message');
    messages.forEach(msg => msg.style.display = 'none');
}

function showAuthMessage(message, type = 'error') {
    clearAuthMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
        activeForm.insertBefore(messageDiv, activeForm.firstChild);
        
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    if (!email || !password) {
        showAuthMessage('Заполните все поля', 'error');
        return;
    }
    
    try {
        showAuthMessage('Выполняется вход...', 'info');
        
        const response = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.success && response.user) {
            const user = {
                id: response.user.id,
                email: email,
                name: response.user.name || email.split('@')[0],
                class_number: response.user.class_number || 7,
                remember_me: rememberMe,
                token: response.token
            };
            
            if (response.token) {
                saveAuthToken(response.token);
            }
            
            saveUserSession(user, rememberMe);
            
            showAuthMessage('Вход выполнен успешно!', 'success');
            
            setTimeout(() => {
                closeAuthModal();
                showCenterMessage(`Добро пожаловать, ${user.name}!`, 'fa-user-check');
                updateUserInterface();
                
                loadServerData();
            }, 1500);
        } else {
            throw new Error(response.message || 'Неверные учетные данные');
        }
        
    } catch (error) {
        showAuthMessage(error.message || 'Ошибка входа. Проверьте подключение к БД', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const classNumber = document.getElementById('register-class').value;
    const termsAccepted = document.getElementById('register-terms').checked;
    
    if (!name || !email || !password || !passwordConfirm || !classNumber) {
        showAuthMessage('Заполните все поля', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showAuthMessage('Пароли не совпадают', 'error');
        return;
    }
    
    if (!termsAccepted) {
        showAuthMessage('Примите условия использования', 'error');
        return;
    }
    
    try {
        showAuthMessage('Регистрация...', 'info');
        
        const response = await apiRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                fullName: name,
                classNumber: parseInt(classNumber)
            })
        });
        
        if (response.success) {
            const user = {
                id: response.user.id,
                email: email,
                name: name,
                class_number: parseInt(classNumber),
                token: response.token
            };
            
            if (response.token) {
                saveAuthToken(response.token);
            }
            
            saveUserSession(user, true);
            
            showAuthMessage('Регистрация прошла успешно!', 'success');
            
            setTimeout(() => {
                closeAuthModal();
                showCenterMessage(`Добро пожаловать, ${user.name}!`, 'fa-user-plus');
                updateUserInterface();
                
                loadServerData();
            }, 1500);
        } else {
            throw new Error(response.message || 'Ошибка регистрации');
        }
        
    } catch (error) {
        showAuthMessage(error.message || 'Ошибка регистрации. Проверьте подключение к БД', 'error');
    }
}

function saveUserSession(user, rememberMe = true) {
    currentUser = user;
    isAuthenticated = true;
    
    if (rememberMe) {
        localStorage.setItem('scool_user', JSON.stringify(user));
    } else {
        sessionStorage.setItem('scool_user', JSON.stringify(user));
    }
}

function logoutUser() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('scool_user');
    sessionStorage.removeItem('scool_user');
    removeAuthToken();
    
    showCenterMessage('Вы вышли из системы', 'fa-sign-out-alt');
    updateUserInterface();
    
    const leaderboards = document.querySelectorAll('.leader-list');
    leaderboards.forEach(leaderList => {
        if (leaderList) {
            leaderList.innerHTML = `
                <li class="leader-item">
                    <div style="text-align: center; width: 100%; padding: 10px; color: #666;">
                        <i class="fas fa-sign-in-alt"></i> Войдите для просмотра лидерборда
                    </div>
                </li>
            `;
        }
    });
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

function setupEventListeners() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
            updateThemeLabels(this.checked);
        });
    }
    
    document.querySelectorAll('.class-btn').forEach(button => {
        button.addEventListener('click', function() {
            const selectedClass = this.getAttribute('data-class');
            switchLayout(selectedClass);
            
            if (currentUser) {
                currentUser.class_number = parseInt(selectedClass);
                localStorage.setItem('scool_user', JSON.stringify(currentUser));
                
                loadSubjectsForClass(selectedClass);
            }
            
            console.log(`Переключились на ${selectedClass} класс`);
        });
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const searchTerm = this.value.trim();
            
            if (searchTerm.length < 2) {
                document.getElementById('search-results').classList.remove('show');
                return;
            }
            
            searchTimeout = setTimeout(() => {
                searchInDatabase(searchTerm);
            }, 300);
        });
        
        document.addEventListener('click', function(event) {
            const searchResults = document.getElementById('search-results');
            if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
                searchResults.classList.remove('show');
            }
        });
    }
    
    document.getElementById('profile-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isAuthenticated && currentUser) {
            showProfileMenu();
        } else {
            openAuthModal();
        }
    });
    
    document.querySelectorAll('.mail-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const email = this.getAttribute('data-email');
            showEmailMessage(email);
        });
    });
    
    document.getElementById('home-from-desktop9')?.addEventListener('click', goToHome);
    document.getElementById('home-from-desktop10')?.addEventListener('click', goToHome);
    document.getElementById('home-from-desktop11')?.addEventListener('click', goToHome);
    
    document.querySelector('.auth-close')?.addEventListener('click', closeAuthModal);
    
    document.getElementById('auth-modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAuthModal();
        }
    });
    
    document.querySelectorAll('.auth-tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
    
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAuthModal();
        }
    });
}

async function loadSubjectsForClass(classNumber) {
    try {
        const subjects = await apiRequest(`/api/subjects/${classNumber}`);
        if (subjects && Array.isArray(subjects)) {
            const layoutId = getLayoutIdByClass(classNumber);
            const layout = document.getElementById(layoutId);
            if (layout) {
                const subjectCards = layout.querySelectorAll('.subject-card');
                subjectCards.forEach((card, index) => {
                    if (subjects[index]) {
                        const titleElement = card.querySelector('h3');
                        if (titleElement) {
                            titleElement.textContent = subjects[index].name || 'Предмет';
                        }
                        
                        const progressFill = card.querySelector('.progress-fill');
                        const progressText = card.querySelector('.progress-text');
                        
                        const progress = subjects[index].progress || 0;
                        
                        if (progressFill) {
                            progressFill.style.width = `${progress}%`;
                        }
                        if (progressText) {
                            progressText.textContent = `${progress}% завершено`;
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки предметов:', error);
        showCenterMessage('Нет данных о предметах в БД', 'fa-database');
    }
}

async function searchInDatabase(searchTerm) {
    try {
        const results = await apiRequest(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        displaySearchResults(results, searchTerm);
    } catch (error) {
        console.error('Ошибка поиска в БД:', error);
        displaySearchResults([], searchTerm);
    }
}

function showProfileMenu() {
    if (!currentUser) return;
    
    const menuHtml = `
        <div class="profile-menu-overlay">
            <div class="profile-menu">
                <div class="profile-header">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <h3>${currentUser.name}</h3>
                        <p>${currentUser.email}</p>
                        <p>${currentUser.class_number} класс</p>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-action-btn" data-action="settings">
                        <i class="fas fa-cog"></i> Настройки
                    </button>
                    <button class="profile-action-btn" data-action="stats">
                        <i class="fas fa-chart-bar"></i> Статистика
                    </button>
                    <button class="profile-action-btn" data-action="help">
                        <i class="fas fa-question-circle"></i> Помощь
                    </button>
                    <button class="profile-action-btn logout" data-action="logout">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.querySelectorAll('.profile-menu-overlay').forEach(el => el.remove());
    
    const styleId = 'profile-menu-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
            .profile-menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                display: flex;
                justify-content: flex-end;
                align-items: flex-start;
                padding: 70px 20px 0 0;
                animation: fadeIn 0.2s;
            }
            
            .profile-menu {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                width: 300px;
                overflow: hidden;
                animation: slideDown 0.3s;
            }
            
            @keyframes slideDown {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .profile-header {
                padding: 20px;
                background: linear-gradient(135deg, #3f51b5, #5c6bc0);
                color: white;
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .profile-header i { font-size: 48px; }
            .profile-header h3 { margin: 0 0 5px 0; font-size: 18px; }
            .profile-header p { margin: 0; font-size: 14px; opacity: 0.9; }
            
            .profile-actions { padding: 10px 0; }
            
            .profile-action-btn {
                width: 100%;
                padding: 12px 20px;
                border: none;
                background: none;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 15px;
                color: #333;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .profile-action-btn:hover { background: #f5f5f5; }
            .profile-action-btn i { width: 20px; text-align: center; }
            .profile-action-btn.logout {
                color: #f44336;
                border-top: 1px solid #eee;
                margin-top: 5px;
            }
            
            body.dark-theme .profile-menu { background: #1e1e1e; }
            body.dark-theme .profile-action-btn { color: #e0e0e0; }
            body.dark-theme .profile-action-btn:hover { background: #2d2d2d; }
            body.dark-theme .profile-action-btn.logout { border-top-color: #333; }
        `;
        document.head.appendChild(styleElement);
    }
    
    const overlay = document.createElement('div');
    overlay.innerHTML = menuHtml;
    document.body.appendChild(overlay);
    
    overlay.querySelectorAll('.profile-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            
            switch(action) {
                case 'settings':
                    showCenterMessage('Настройки профиля в разработке!', 'fa-cog');
                    break;
                case 'stats':
                    showCenterMessage('Статистика в разработке!', 'fa-chart-bar');
                    break;
                case 'help':
                    showCenterMessage('Раздел помощи в разработке!', 'fa-question-circle');
                    break;
                case 'logout':
                    logoutUser();
                    break;
            }
            
            overlay.remove();
        });
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
    
    const closeMenu = function(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', closeMenu);
        }
    };
    document.addEventListener('keydown', closeMenu);
}

function showEmailMessage(email) {
    const styleId = 'email-message-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
            .email-message-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            
            .email-message-box {
                background-color: white;
                border-radius: 16px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.4s ease;
                text-align: center;
            }
            
            body.dark-theme .email-message-box {
                background-color: #1e1e1e;
                color: #e0e0e0;
            }
            
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            
            .email-icon-large { font-size: 48px; color: #87CEEB; margin-bottom: 20px; }
            
            .email-message-box h3 {
                margin: 0 0 15px 0;
                font-size: 24px;
                color: #333;
            }
            
            body.dark-theme .email-message-box h3 { color: #e0e0e0; }
            
            .email-address {
                font-size: 18px;
                font-weight: bold;
                color: #3f51b5;
                margin: 15px 0;
                padding: 12px;
                background-color: #f0f8ff;
                border-radius: 8px;
                border: 2px solid #87CEEB;
                word-break: break-all;
            }
            
            body.dark-theme .email-address {
                background-color: #2d2d2d;
                color: #87CEEB;
                border-color: #5cb4e0;
            }
            
            .email-hint {
                font-size: 14px;
                color: #666;
                margin: 15px 0 25px 0;
                line-height: 1.5;
            }
            
            body.dark-theme .email-hint { color: #aaa; }
            
            .email-buttons { display: flex; gap: 15px; justify-content: center; }
            
            .email-btn {
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
                border: none;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
            }
            
            .email-copy-btn {
                background-color: #87CEEB;
                color: white;
            }
            
            .email-copy-btn:hover {
                background-color: #64b5f6;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(135, 206, 235, 0.3);
            }
            
            .email-close-btn {
                background-color: #f0f0f0;
                color: #333;
            }
            
            body.dark-theme .email-close-btn {
                background-color: #333;
                color: #e0e0e0;
            }
            
            .email-close-btn:hover {
                background-color: #e0e0e0;
                transform: translateY(-2px);
            }
            
            body.dark-theme .email-close-btn:hover { background-color: #444; }
            
            .copy-success {
                color: #4CAF50;
                font-size: 14px;
                margin-top: 15px;
                animation: fadeInOut 3s ease;
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    document.querySelectorAll('.email-message-overlay').forEach(overlay => overlay.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'email-message-overlay';
    
    overlay.innerHTML = `
        <div class="email-message-box">
            <i class="fas fa-envelope email-icon-large"></i>
            <h3>Написать нам</h3>
            <p>Наша почта для обратной связи:</p>
            <div class="email-address">${email}</div>
            <p class="email-hint">Скопируйте адрес и напишите нам в вашем почтовом клиенте</p>
            <div class="email-buttons">
                <button class="email-btn email-copy-btn">
                    <i class="fas fa-copy"></i> Скопировать
                </button>
                <button class="email-btn email-close-btn">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const copyBtn = overlay.querySelector('.email-copy-btn');
    const closeBtn = overlay.querySelector('.email-close-btn');
    
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(email).then(() => {
            const successMsg = document.createElement('div');
            successMsg.className = 'copy-success';
            successMsg.textContent = 'Email скопирован в буфер обмена!';
            overlay.querySelector('.email-message-box').appendChild(successMsg);
            
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.remove();
                }
            }, 3000);
        });
    });
    
    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 10000);
}

function showCenterMessage(message, icon = 'fa-tools') {
    const centerMessage = document.getElementById('center-message');
    const centerIcon = document.getElementById('center-message-icon');
    const centerText = document.getElementById('center-message-text');
    
    if (!centerMessage || !centerIcon || !centerText) return;
    
    centerIcon.className = `fas ${icon} center-message-icon`;
    centerText.textContent = message;
    
    centerMessage.classList.add('show');
    
    setTimeout(() => {
        hideCenterMessage();
    }, 4000);
}

function hideCenterMessage() {
    const centerMessage = document.getElementById('center-message');
    if (centerMessage) {
        centerMessage.classList.remove('show');
    }
}

function displaySearchResults(results, searchTerm) {
    const searchResults = document.getElementById('search-results');
    const searchInput = document.getElementById('search-input');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'search-no-results';
        noResults.innerHTML = `
            <i class="fas fa-search" style="margin-right: 8px;"></i>
            ничего не найдено
        `;
        searchResults.appendChild(noResults);
    } else {
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            const highlightedTitle = highlightText(item.title, searchTerm);
            const highlightedDesc = highlightText(item.description, searchTerm);
            
            resultItem.innerHTML = `
                <i class="${item.icon || 'fas fa-search'} result-icon"></i>
                <div class="result-text">
                    <div>${highlightedTitle}</div>
                    <small>${highlightedDesc}</small>
                </div>
                <span class="result-type">${item.type}</span>
            `;
            
            resultItem.addEventListener('click', function() {
                searchResults.classList.remove('show');
                if (searchInput) searchInput.value = '';
                
                if (item.type === 'Ученик') {
                    document.querySelector('.leaderboard')?.scrollIntoView({ behavior: 'smooth' });
                } else if (item.type === 'Предмет') {
                    const activeLayout = getActiveLayout();
                    if (activeLayout) {
                        const subjectCards = activeLayout.querySelectorAll('.subject-card');
                        if (subjectCards.length > 0) {
                            subjectCards[0].scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }
            });
            
            searchResults.appendChild(resultItem);
        });
    }
    
    searchResults.classList.add('show');
}

function getLayoutIdByClass(className) {
    switch(className) {
        case '7': return 'desktop9-layout';
        case '8': return 'desktop10-layout';
        case '9': return 'desktop11-layout';
        default: return 'standard-layout';
    }
}

function switchLayout(selectedClass) {
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
    const selectedBtn = document.querySelector(`.class-btn[data-class="${selectedClass}"]`);
    if (selectedBtn) selectedBtn.classList.add('active');
    
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'none';
    
    const layoutId = getLayoutIdByClass(selectedClass);
    document.getElementById(layoutId).style.display = 'flex';
    
    updatePageTitle(selectedClass);
}

function getActiveLayout() {
    const layouts = [
        'desktop9-layout',
        'desktop10-layout', 
        'desktop11-layout',
        'standard-layout'
    ];
    
    for (const layoutId of layouts) {
        const layout = document.getElementById(layoutId);
        if (layout && layout.style.display !== 'none') {
            return layout;
        }
    }
    
    return document.getElementById('standard-layout');
}

function goToHome() {
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'flex';
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
}

function updatePageTitle(classNumber) {
    const pageTitles = document.querySelectorAll('.page-title, .layout-title');
    pageTitles.forEach(title => {
        if (title.textContent.includes('класс')) {
            title.textContent = `Физика - ${classNumber} класс`;
        }
    });
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function updateThemeLabels(isDark) {
    const lightLabel = document.querySelector('.theme-label.light');
    const darkLabel = document.querySelector('.theme-label.dark');
    
    if (lightLabel && darkLabel) {
        if (isDark) {
            lightLabel.style.color = '#aaa';
            lightLabel.style.fontWeight = 'normal';
            darkLabel.style.color = '#87CEEB';
            darkLabel.style.fontWeight = '500';
        } else {
            lightLabel.style.color = '#3f51b5';
            lightLabel.style.fontWeight = '500';
            darkLabel.style.color = '#666';
            darkLabel.style.fontWeight = 'normal';
        }
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - SCool для Railway');
    
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
        updateThemeLabels(true);
    } else {
        updateThemeLabels(false);
    }
    
    initApp();
    
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'flex';
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
});

function forceRussianTitles() {
    const replacements = {
        'Physics': 'Физика',
        'physics': 'Физика',
        'PHYSICS': 'Физика',
        'Mathematics': 'Математика',
        'Math': 'Математика',
        'Chemistry': 'Химия',
        'Biology': 'Биология',
        'Algebra': 'Алгебра',
        'Geometry': 'Геометрия',
        'Computer Science': 'Информатика',
        'Informatics': 'Информатика'
    };
    
    document.querySelectorAll('.subject-card h3').forEach(title => {
        const currentText = title.textContent.trim();
        if (currentText === '' || replacements[currentText]) {
            const newText = replacements[currentText] || 'Физика';
            if (currentText !== newText) {
                title.textContent = newText;
            }
        }
    });
}

setTimeout(forceRussianTitles, 500);
