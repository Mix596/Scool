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

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ И ФРОНТЕНД РОУТЫ ==========
if (frontendExists) {
  console.log('\n🌐 CONFIGURING FRONTEND ROUTES...');
  
  // Статические файлы из фронтенда
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  console.log('✅ Static files configured');
  
  // Фронтенд маршруты
  app.get('/', (req, res) => {
    console.log(`📄 Serving index.html for route: ${req.path}`);
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  
  app.get('/app', (req, res) => {
    console.log(`📄 Redirecting /app to /`);
    res.redirect('/');
  });
  
  app.get('/app/*', (req, res) => {
    const newPath = req.path.replace('/app', '');
    console.log(`📄 Redirecting ${req.path} to ${newPath}`);
    res.redirect(newPath);
  });
  
  // SPA маршрутизация - все не-API пути показывают фронтенд
  app.get('*', (req, res, next) => {
    // Пропускаем API маршруты
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Пропускаем уже обработанные маршруты
    if (req.path === '/' || req.path === '/health') {
      return next();
    }
    // Пропускаем статические файлы (если они существуют)
    const fullPath = path.join(frontendPath, req.path);
    if (fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()) {
      return next();
    }
    // Все остальные маршруты показывают SPA
    console.log(`🔄 SPA route: ${req.path} -> index.html`);
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  
  console.log('✅ Frontend routes configured');
}

// ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
initializeDatabase().then(() => {
  console.log('\n✅ DATABASE INITIALIZATION COMPLETE');
  console.log('✅ SERVER READY TO USE RAILWAY MYSQL DATABASE');
}).catch(err => {
  console.error('\n❌ DATABASE INIT FAILED:', err.message);
  console.error('❌ SERVER CANNOT START WITHOUT DATABASE CONNECTION');
});

// ========== API ENDPOINTS ==========

// Проверка здоровья (Railway healthcheck)
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

// Главная страница API
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCool API - Production',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: detectedPort,
    database: pool ? 'connected' : 'disconnected',
    frontend: frontendExists ? 'available' : 'not_found',
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

// ========== ОБРАБОТКА ОШИБОК ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    port: detectedPort
  });
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
  
  console.log('\n🌐 AVAILABLE ENDPOINTS:');
  console.log(`   Main Website:    http://localhost:${detectedPort}/`);
  console.log(`   Health Check:    http://localhost:${detectedPort}/health`);
  console.log(`   API Documentation: http://localhost:${detectedPort}/api`);
  console.log(`   Database Info:   http://localhost:${detectedPort}/api/db-info`);
  console.log(`   Subjects (7th):  http://localhost:${detectedPort}/api/subjects/7`);
  console.log(`   Leaderboard:     http://localhost:${detectedPort}/api/leaderboard`);
  
  if (pool) {
    console.log(`\n💾 DATABASE:       ✅ CONNECTED TO RAILWAY MYSQL`);
    console.log(`   Status: Online`);
  } else {
    console.log(`\n💾 DATABASE:       ❌ DISCONNECTED`);
  }
  
  if (frontendExists) {
    console.log(`\n🌐 FRONTEND:        ✅ DETECTED`);
    console.log(`   Main App:       http://localhost:${detectedPort}/`);
    console.log(`   CSS:            http://localhost:${detectedPort}/style.css`);
    console.log(`   JS:             http://localhost:${detectedPort}/script.js`);
  } else {
    console.log(`\n🌐 FRONTEND:        ❌ NOT FOUND`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 USING RAILWAY MYSQL DATABASE');
  console.log(` Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(` Port: ${detectedPort}`);
  console.log(` Database: ${pool ? '✅ Railway MySQL' : '❌ No database'}`);
  console.log(` Frontend: ${frontendExists ? '✅ Found' : '❌ Missing'}`);
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
