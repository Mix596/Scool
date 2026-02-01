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
    
    // Показываем существующие таблицы
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📊 EXISTING TABLES IN DATABASE:');
    
    if (tables.length === 0) {
      console.log('   No tables found');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
    }
    
    // Проверяем структуру таблиц
    await checkTableStructure(connection);
    
    connection.release();
    
    return pool;
    
  } catch (err) {
    console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    console.error('   Error code:', err.code);
    throw new Error(`Cannot connect to Railway MySQL: ${err.message}`);
  }
}

// Проверка структуры существующих таблиц
async function checkTableStructure(connection) {
  try {
    console.log('\n🔍 CHECKING TABLE STRUCTURE...');
    
    // Проверяем наличие таблицы leaderboard
    try {
      const [leaderboardColumns] = await connection.query('DESCRIBE leaderboard');
      console.log('✅ leaderboard table exists');
      console.log(`   Columns: ${leaderboardColumns.map(col => col.Field).join(', ')}`);
    } catch (err) {
      console.log('⚠️  leaderboard table not found or error:', err.message);
    }
    
    // Проверяем наличие таблицы subjects
    try {
      const [subjectsColumns] = await connection.query('DESCRIBE subjects');
      console.log('✅ subjects table exists');
      console.log(`   Columns: ${subjectsColumns.map(col => col.Field).join(', ')}`);
    } catch (err) {
      console.log('⚠️  subjects table not found or error:', err.message);
    }
    
    // Проверяем наличие таблицы users
    try {
      const [usersColumns] = await connection.query('DESCRIBE users');
      console.log('✅ users table exists');
      console.log(`   Columns: ${usersColumns.map(col => col.Field).join(', ')}`);
    } catch (err) {
      console.log('⚠️  users table not found or error:', err.message);
    }
    
  } catch (err) {
    console.error('Error checking table structure:', err.message);
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
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  console.log('✅ Static files configured');
}

// ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
initializeDatabase().then(() => {
  console.log('\n✅ DATABASE INITIALIZATION COMPLETE');
  console.log('✅ SERVER READY TO USE EXISTING RAILWAY MYSQL DATABASE');
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
      subjects: 'GET /api/subjects/:class',
      leaderboard: 'GET /api/leaderboard',
      score: 'POST /api/score',
      subject_progress: 'POST /api/subject-progress',
      health: '/health',
      db_info: '/api/db-info'
    },
    info: 'Using existing Railway MySQL database'
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
      
      // Добавляем информацию о БД
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
    
    // Получаем список таблиц
    const [tables] = await pool.query('SHOW TABLES');
    
    // Получаем количество записей в каждой таблице
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

// ========== ОСНОВНЫЕ ЭНДПОИНТЫ (ИСПОЛЬЗУЮТ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ) ==========

// Получить предметы для класса (из существующей таблицы subjects)
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
    // Пытаемся получить данные из существующей таблицы subjects
    const [rows] = await pool.query(
      'SELECT * FROM subjects WHERE class = ? ORDER BY name',
      [classNum]
    );
    
    // Если таблица существует, возвращаем данные
    res.json({
      status: 'success',
      count: rows.length,
      data: rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    // Если таблицы не существует, возвращаем ошибку
    if (err.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({
        status: 'error',
        message: 'Subjects table not found in database',
        suggestion: 'Create subjects table in Railway MySQL',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Database query failed',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Лидерборд (из существующей таблицы leaderboard)
app.get('/api/leaderboard', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: 'database_error',
      message: 'Database connection not available',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Пытаемся получить данные из существующей таблицы leaderboard
    const [rows] = await pool.query(
      'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 20'
    );
    
    res.json({
      status: 'success',
      count: rows.length,
      data: rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).json({
        status: 'error',
        message: 'Leaderboard table not found in database',
        suggestion: 'Create leaderboard table in Railway MySQL',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Database query failed',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Добавить/обновить результат (в существующую таблицу leaderboard)
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
      
      // Проверяем существование таблицы
      const [tables] = await connection.query('SHOW TABLES LIKE "leaderboard"');
      if (tables.length === 0) {
        throw new Error('leaderboard table does not exist');
      }
      
      // Вставляем или обновляем запись
      await connection.query(`
        INSERT INTO leaderboard (username, name, score) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          score = VALUES(score), 
          name = VALUES(name),
          updated_at = CURRENT_TIMESTAMP
      `, [username, name, score]);
      
      // Обновляем ранги
      await connection.query(`
        SET @rank_num = 0;
        UPDATE leaderboard 
        SET \`rank\` = (@rank_num := @rank_num + 1)
        ORDER BY score DESC;
      `);
      
      await connection.commit();
      
      // Получаем обновленные данные
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
        message: 'Score updated in Railway MySQL'
      });
      
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (err) {
    if (err.message.includes('does not exist')) {
      res.status(404).json({ 
        success: false, 
        message: 'Leaderboard table not found in Railway MySQL',
        suggestion: 'Create the table first using MySQL Workbench'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
  }
});

// Обновить прогресс предмета (в существующую таблицу subjects)
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
    
    // Проверяем существование таблицы
    const [tables] = await pool.query('SHOW TABLES LIKE "subjects"');
    if (tables.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subjects table not found in Railway MySQL',
        suggestion: 'Create subjects table first'
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
      message: 'Progress updated in Railway MySQL',
      data: { name, class: classNum, progress }
    });
    
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Топ-10 игроков
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
    res.json({
      status: 'success',
      data: rows
    });
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
  console.log('🚀 USING EXISTING RAILWAY MYSQL DATABASE');
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
