// ========== RAILWAY EMERGENCY PORT FIX ==========
console.log('='.repeat(60));
console.log('🚀 RAILWAY EMERGENCY PORT FIX');
console.log('='.repeat(60));

console.log('ALL ENVIRONMENT VARIABLES:');
for (const key in process.env) {
  if (key.includes('PORT') || key.includes('RAILWAY')) {
    console.log(`  ${key}=${process.env[key]}`);
  }
}

let detectedPort = null;

if (process.env.PORT) {
  detectedPort = parseInt(process.env.PORT);
  console.log(` Found port in process.env.PORT: ${detectedPort}`);
} else if (process.argv.some(arg => arg.includes('port') || arg.includes('PORT'))) {
  for (const arg of process.argv) {
    if (arg.includes('=') && arg.includes('port')) {
      detectedPort = parseInt(arg.split('=')[1]);
      console.log(` Found port in command line: ${detectedPort}`);
      break;
    }
  }
} else {
  detectedPort = 8080;
  console.log(` No port detected, using Railway default: ${detectedPort}`);
}

console.log('='.repeat(60));
console.log(' SCool Server - Railway Deployment');
console.log('='.repeat(60));
console.log(` Railway PORT variable: "${process.env.PORT}"`);
console.log(` Using PORT: ${detectedPort}`);
console.log(` NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(` Listen address: 0.0.0.0`);
console.log('='.repeat(60));

// ========== RAILWAY MYSQL CONFIGURATION ==========
console.log('\n RAILWAY MYSQL CONFIGURATION');
console.log('='.repeat(30));

// Проверяем все MySQL переменные
console.log(' Checking MySQL variables:');
const mysqlVars = {};
let mysqlUrl = null;

for (const key in process.env) {
  if (key.includes('MYSQL')) {
    if (key === 'MYSQL_URL') {
      mysqlUrl = process.env[key];
      // Маскируем пароль для логов
      mysqlVars[key] = process.env[key].replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    } else if (key.includes('PASSWORD')) {
      mysqlVars[key] = '******';
    } else {
      mysqlVars[key] = process.env[key];
    }
  }
}

console.log(mysqlVars);
console.log(` MYSQL_URL found: ${!!mysqlUrl}`);
console.log(` Using MYSQL_URL for connection`);
console.log('='.repeat(60));

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Проверяем наличие mysql2 модуля
try {
  const mysql2 = require('mysql2/promise');
  console.log(` mysql2 module: ${require('mysql2/package.json').version}`);
} catch (err) {
  console.error(' ERROR loading mysql2 module:', err.message);
  console.error('Full error:', err);
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
  // Railway предоставляет MYSQL_URL для MySQL подключения
  if (!mysqlUrl) {
    console.log('  MYSQL_URL not found - running in local mode');
    console.log('   Railway должен предоставить MYSQL_URL через ${{ MySQL.MYSQL_URL }}');
    console.log('   Добавьте в Variables вашего сервиса: MYSQL_URL = ${{ MySQL.MYSQL_URL }}');
    return null;
  }

  try {
    console.log('🔌 Connecting to Railway MySQL...');
    
    // Маскируем для логов
    const maskedUrl = mysqlUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`   Using: ${maskedUrl.substring(0, 50)}...`);
    
    const poolConfig = {
      uri: mysqlUrl,
      ssl: {
        rejectUnauthorized: false
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      timezone: 'Z', // Используем UTC
      charset: 'utf8mb4',
      // Явно указываем имя базы данных
      database: process.env.MYSQLDATABASE || 'railway'
    };

    pool = mysql.createPool(poolConfig);
    
    // Тестируем подключение
    const connection = await pool.getConnection();
    console.log(' DATABASE CONNECTED');
    
    // Получаем информацию о подключении
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    const [dbRows] = await connection.query('SELECT DATABASE() as db, USER() as user');
    
    console.log(`   Database: ${dbRows[0].db}`);
    console.log(`   User: ${dbRows[0].user}`);
    console.log(`   MySQL: ${versionRows[0].version}`);
    
    // Убедимся, что используем правильную базу данных
    const currentDb = dbRows[0].db;
    if (!currentDb || currentDb === 'NULL') {
      const targetDb = process.env.MYSQLDATABASE || 'railway';
      await connection.query(`USE \`${targetDb}\``);
      console.log(`   Switched to database: ${targetDb}`);
    }
    
    connection.release();
    
    // Создаем таблицы
    await createTables();
    
    return pool;
    
  } catch (err) {
    console.error(' DATABASE CONNECTION FAILED:', err.message);
    console.error('   Error code:', err.code);
    console.error('   Error number:', err.errno);
    console.log('  Running without database connection');
    return null;
  }
}

// Функция создания таблиц
async function createTables() {
  if (!pool) return;
  
  try {
    console.log('\n CREATING DATABASE TABLES...');
    
    // Создаем базу данных если не существует
    const dbName = process.env.MYSQLDATABASE || 'railway';
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await pool.query(`USE \`${dbName}\``);
    console.log(` Using database: ${dbName}`);
    
    // Таблица leaderboard
    await pool.query(`
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
    console.log(' leaderboard table ready');

    // Таблица subjects
    await pool.query(`
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
    console.log(' subjects table ready');

    // Таблица users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        class INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT class_check CHECK (class >= 1 AND class <= 11)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log(' users table ready');

    console.log(' DATABASE TABLES READY');
    
    // Проверим таблицы
    await checkTables();
    
    // Добавляем тестовые данные
    await seedDatabase();
    
  } catch (err) {
    console.error(' DATABASE SETUP ERROR:', err.message);
    console.error('Full error:', err);
  }
}

// Проверить существующие таблицы
async function checkTables() {
  if (!pool) return;
  
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('\n EXISTING TABLES:');
    if (tables.length === 0) {
      console.log('   No tables found');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   - ${tableName}`);
      });
    }
  } catch (err) {
    console.error('Error checking tables:', err.message);
  }
}

// Добавление тестовых данных
async function seedDatabase() {
  if (!pool) return;
  
  try {
    console.log('\n SEEDING DATABASE...');
    
    // Проверяем leaderboard
    const [leaderboardResult] = await pool.query('SELECT COUNT(*) as count FROM leaderboard');
    const leaderboardCount = parseInt(leaderboardResult[0].count);
    
    if (leaderboardCount === 0) {
      await pool.query(`
        INSERT INTO leaderboard (username, name, score, \`rank\`) VALUES 
        ('elena_v', 'Elena V.', 1200, 1),
        ('vasya', 'Vasya P.', 1000, 2),
        ('evgeniy', 'Evgeniy S.', 900, 3),
        ('maria_k', 'Maria K.', 850, 4),
        ('alex_t', 'Alex T.', 800, 5)
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          score = VALUES(score),
          \`rank\` = VALUES(\`rank\`)
      `);
      console.log(`    Added ${Math.min(5, 5)} leaderboard entries`);
    } else {
      console.log(`     Leaderboard: ${leaderboardCount} entries found`);
    }
    
    // Проверяем subjects
    const [subjectsResult] = await pool.query('SELECT COUNT(*) as count FROM subjects');
    const subjectsCount = parseInt(subjectsResult[0].count);
    
    if (subjectsCount === 0) {
      await pool.query(`
        INSERT INTO subjects (name, class, progress) VALUES 
        ('Physics', 7, 95),
        ('Mathematics', 7, 88),
        ('Chemistry', 7, 78),
        ('Physics', 8, 75),
        ('Physics', 9, 60),
        ('Biology', 9, 85),
        ('Informatics', 10, 92)
        ON DUPLICATE KEY UPDATE 
          progress = VALUES(progress)
      `);
      console.log(`    Added ${Math.min(7, 7)} subject entries`);
    } else {
      console.log(`     Subjects: ${subjectsCount} entries found`);
    }
    
    console.log(' SEEDING COMPLETE');
    
  } catch (err) {
    console.error(' SEED ERROR:', err.message);
  }
}

// ========== ПУТИ К ФАЙЛАМ ==========
const projectRoot = process.cwd();
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

console.log('\n FILE SYSTEM PATHS:');
console.log(`   Project Root: ${projectRoot}`);
console.log(`   Frontend Dir: ${frontendPath}`);
console.log(`   Frontend Exists: ${frontendExists ? ' YES' : ' NO'}`);

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
  console.log(' Static files configured');
}

// ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
initializeDatabase().then(() => {
  console.log('\n DATABASE INITIALIZATION COMPLETE');
}).catch(err => {
  console.error(' DATABASE INIT FAILED:', err);
});

// ========== HEALTH CHECK ==========
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'scool-api',
    port: detectedPort,
    railway_port: process.env.PORT,
    environment: process.env.NODE_ENV || 'development',
    database: 'checking',
    mysql_variables: {
      MYSQL_URL: !!mysqlUrl,
      MYSQLDATABASE: process.env.MYSQLDATABASE,
      MYSQLHOST: process.env.MYSQLHOST,
      MYSQLPORT: process.env.MYSQLPORT
    }
  };

  try {
    if (pool) {
      await pool.query('SELECT 1');
      health.database = 'connected';
      health.database_status = 'healthy';
      health.database_type = 'MySQL';
    } else if (mysqlUrl) {
      health.database = 'disconnected';
      health.database_status = 'no_pool';
      health.database_type = 'MySQL (MYSQL_URL found)';
    } else {
      health.database = 'local_mode';
      health.database_status = 'not_configured';
    }
    
    res.status(200).json(health);
    
  } catch (err) {
    health.database = 'error';
    health.database_error = err.message;
    health.status = 'degraded';
    res.status(200).json(health);
  }
});

// ========== API ENDPOINTS ==========
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCool API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: detectedPort,
    railway_port: process.env.PORT,
    documentation: {
      health: '/health',
      api: '/api/health',
      db_check: '/api/db-check',
      subjects: '/api/subjects/:class',
      leaderboard: '/api/leaderboard',
      frontend: frontendExists ? '/app' : null
    },
    environment: {
      node: process.version,
      database: mysqlUrl ? 'MySQL configured' : 'local',
      frontend: frontendExists
    }
  });
});

app.get('/api/health', async (req, res) => {
  const apiHealth = {
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: detectedPort,
    endpoints: {
      subjects: 'active',
      leaderboard: 'active',
      score: 'active'
    }
  };

  try {
    if (pool) {
      await pool.query('SELECT 1');
      apiHealth.database = 'connected';
    } else {
      apiHealth.database = 'local_mode';
    }
    
    res.status(200).json(apiHealth);
  } catch (err) {
    apiHealth.database = 'error';
    apiHealth.error = err.message;
    apiHealth.status = 'degraded';
    res.status(200).json(apiHealth);
  }
});

// Проверка базы данных
app.get('/api/db-check', async (req, res) => {
  if (!pool) {
    return res.json({
      status: 'local_mode',
      message: 'Running without database connection',
      mysql_url: !!mysqlUrl,
      mysql_variables: {
        MYSQL_URL: !!mysqlUrl,
        MYSQLDATABASE: process.env.MYSQLDATABASE,
        MYSQLHOST: process.env.MYSQLHOST
      },
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const [versionRows] = await pool.query('SELECT VERSION() as version');
    const [dbRows] = await pool.query('SELECT DATABASE() as db');
    const [statsRows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM leaderboard) as leaderboard_count,
        (SELECT COUNT(*) FROM subjects) as subjects_count,
        (SELECT COUNT(*) FROM users) as users_count
    `);
    
    // Получаем список таблиц
    const [tables] = await pool.query('SHOW TABLES');
    
    res.json({
      status: 'connected',
      database: 'MySQL',
      version: versionRows[0].version,
      current_database: dbRows[0].db,
      stats: statsRows[0],
      tables_count: tables.length,
      tables: tables.map(t => Object.values(t)[0]),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
      mysql_url: !!mysqlUrl,
      timestamp: new Date().toISOString()
    });
  }
});

// Получить предметы для класса
app.get('/api/subjects/:class', async (req, res) => {
  const classNum = parseInt(req.params.class);
  
  if (!pool) {
    const fallbackData = [
      { id: 1, name: 'Physics', class: classNum, progress: 95 },
      { id: 2, name: 'Mathematics', class: classNum, progress: 88 },
      { id: 3, name: 'Chemistry', class: classNum, progress: 78 },
      { id: 4, name: 'Biology', class: classNum, progress: 85 }
    ];
    return res.json(fallbackData);
  }
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM subjects WHERE class = ? ORDER BY name',
      [classNum]
    );
    
    if (rows.length === 0) {
      const defaultSubjects = [
        { id: 1, name: 'Physics', class: classNum, progress: 0 },
        { id: 2, name: 'Mathematics', class: classNum, progress: 0 },
        { id: 3, name: 'Chemistry', class: classNum, progress: 0 },
        { id: 4, name: 'Biology', class: classNum, progress: 0 }
      ];
      res.json(defaultSubjects);
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error('Subjects error:', err);
    res.json([
      { id: 1, name: 'Physics', class: classNum, progress: 95 },
      { id: 2, name: 'Mathematics', class: classNum, progress: 88 }
    ]);
  }
});

// Лидерборд
app.get('/api/leaderboard', async (req, res) => {
  if (!pool) {
    return res.json([
      { id: 1, username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
      { id: 2, username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
      { id: 3, username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 },
      { id: 4, username: 'maria_k', name: 'Maria K.', score: 850, rank: 4 },
      { id: 5, username: 'alex_t', name: 'Alex T.', score: 800, rank: 5 }
    ]);
  }
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM leaderboard ORDER BY rank IS NULL, rank ASC LIMIT 20'
    );
    
    if (rows.length === 0) {
      const mockData = [
        { id: 1, username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
        { id: 2, username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
        { id: 3, username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
      ];
      res.json(mockData);
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.json([
      { id: 1, username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
      { id: 2, username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
      { id: 3, username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
    ]);
  }
});

// Добавить/обновить результат
app.post('/api/score', async (req, res) => {
  if (!pool) {
    return res.status(200).json({ 
      success: false, 
      message: 'Database not available, running in local mode' 
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
        INSERT INTO leaderboard (username, name, score, rank) 
        VALUES (?, ?, ?, 999)
        ON DUPLICATE KEY UPDATE 
          score = VALUES(score), 
          updated_at = CURRENT_TIMESTAMP
      `, [username, name, score]);
      
      await connection.query(`
        UPDATE leaderboard l
        JOIN (
          SELECT username, 
                 ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
          FROM leaderboard
        ) r ON l.username = r.username
        SET l.rank = r.new_rank,
            l.updated_at = CURRENT_TIMESTAMP
      `);
      
      await connection.commit();
      
      const [result] = await connection.query(
        'SELECT * FROM leaderboard WHERE username = ?',
        [username]
      );
      
      res.json({
        success: true,
        rank: result[0]?.rank || 999,
        score: score
      });
      
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (err) {
    console.error('Score update error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.post('/api/subject-progress', async (req, res) => {
  if (!pool) {
    return res.status(200).json({ 
      success: false, 
      message: 'Database not available' 
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
      message: 'Progress updated' 
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
    return res.json([
      { username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
      { username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
      { username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
    ]);
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

// ========== ДИАГНОСТИЧЕСКИЕ ЭНДПОИНТЫ ==========
app.get('/api/debug/vars', (req, res) => {
  const debugInfo = {
    port: {
      detected: detectedPort,
      env_port: process.env.PORT
    },
    database: {
      mysql_url: mysqlUrl ? 'exists (masked)' : 'not found',
      mysql_variables: {}
    },
    railway: {
      service_id: process.env.RAILWAY_SERVICE_ID,
      environment_id: process.env.RAILWAY_ENVIRONMENT_ID,
      project_id: process.env.RAILWAY_PROJECT_ID
    }
  };

  // Собираем MySQL переменные
  for (const key in process.env) {
    if (key.includes('MYSQL')) {
      if (key.includes('URL') || key.includes('PASSWORD')) {
        debugInfo.database.mysql_variables[key] = '******';
      } else {
        debugInfo.database.mysql_variables[key] = process.env[key];
      }
    }
  }

  res.json(debugInfo);
});

// Принудительное создание таблиц
app.post('/api/db/init', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database pool not initialized' 
      });
    }
    
    await createTables();
    
    res.json({ 
      success: true, 
      message: 'Database tables created' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ========== FRONTEND ROUTES ==========
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

// ========== ERROR HANDLING ==========
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
        '/api/health',
        '/api/db-check',
        '/api/subjects/:class',
        '/api/leaderboard',
        '/api/debug/vars'
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
  console.log(` SERVER RUNNING ON PORT: ${detectedPort}`);
  console.log(` Internal URL: http://0.0.0.0:${detectedPort}`);
  console.log(` Local URL:    http://localhost:${detectedPort}`);
  console.log('='.repeat(60));
  console.log('\n📡 PUBLIC ENDPOINTS:');
  console.log(`    Main API:     https://YOUR_PROJECT.railway.app/`);
  console.log(`     Health:       https://YOUR_PROJECT.railway.app/health`);
  console.log(`    DB Check:     https://YOUR_PROJECT.railway.app/api/db-check`);
  console.log(`   Subjects:     https://YOUR_PROJECT.railway.app/api/subjects/7`);
  console.log(`    Leaderboard:  https://YOUR_PROJECT.railway.app/api/leaderboard`);
  console.log(`    Frontend:     https://YOUR_PROJECT.railway.app/app`);
  console.log(`    Debug:        https://YOUR_PROJECT.railway.app/api/debug/vars`);
  
  if (mysqlUrl) {
    console.log(`\n💾 DATABASE:       ${pool ? ' CONNECTED' : ' DISCONNECTED'}`);
    if (pool) {
      console.log(`   Type: MySQL via MYSQL_URL`);
      console.log(`   Database: ${process.env.MYSQLDATABASE || 'railway'}`);
    }
  } else {
    console.log(`\n💾 DATABASE:       ⚠️  LOCAL MODE (no MYSQL_URL)`);
  }
  
  if (frontendExists) {
    console.log(`\n🌐 FRONTEND:        DETECTED`);
    console.log(`   App:         http://localhost:${detectedPort}/app`);
    console.log(`   CSS:         http://localhost:${detectedPort}/style.css`);
    console.log(`   JS:          http://localhost:${detectedPort}/script.js`);
  } else {
    console.log(`\n🌐 FRONTEND:        NOT FOUND`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(' READY FOR RAILWAY DEPLOYMENT');
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Port: ${detectedPort} (Railway: ${process.env.PORT || 'auto'})`);
  console.log(` Database: ${mysqlUrl ? 'MySQL configured' : 'Local mode'}`);
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
